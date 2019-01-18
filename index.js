const linebot = require('linebot');
const express = require('express');
const bus = require('./bus/route');
const models = require('./models');
const config = require('config');
const Service = require('./services');
global.Service = new Service();
const { channelId, channelAccessToken, channelSecret} = config;
const { formatQuickReply, formatEstimatedTimeOfArrival } = require('./util/common')

let bot = linebot({
    channelId: process.env.ChannelId || channelId,
    channelSecret: process.env.ChannelSecret || channelSecret,
    channelAccessToken: process.env.ChannelAccessToken || channelAccessToken
});

console.log("process env === %O", process.env.Connection.options);
 
var start = {};//查詢是否開始
var step = {};//查詢到第幾個步驟了
var searchRoute = {}; // 查詢路線
var searchDirection = {} // 查詢方向
var searchStop = {}; // 查詢站點
var branch = {
  "查詢": 1,
  "設定常用站牌": 2
};
bot.on('message', async function(event) {
    const senderID = event.source.userId;
    console.log(start[senderID]);
    if (event.message.type = 'text') {
      let msg = event.message.text;
      if(start[senderID]!=0 && start[senderID]!= undefined) {
        switch(start[senderID]) {
          case 1: await searchButton(msg, senderID, event); // 查詢
          break;
          case 2: await settingRoute(msg, senderID, event); // 設定路線
          break;
          case 3: await settingMiddleware(msg, senderID, event); // 已有路線詢問設定
          break;
          case 4: await deleteFlow(msg, senderID, event); // 刪除流程
        }
      } else {
        start[senderID] = branch[msg];
        switch(branch[msg]) {
          case 1: await searchButton(msg, senderID, event);
          break;
          case 2: await settingRoute(msg, senderID, event);
          break;
          case 3: await settingMiddleware(msg, senderID, event); // 已有路線詢問設定
          break;
        }
      }
    } else {
       await event.reply("輸入錯誤，請重新開始");
       step[senderID] = 0;
    }
  });

  bot.on('postback', async function (event) {
    console.log(event);
    const senderID = event.source.userId;
    let msg = event.postback.data;
    try {
      if(step[senderID] == 2) {
        let direction = 0;
        if(msg.indexOf("回程") >= 0) {
          direction = 1;
        }
        searchDirection[senderID] = direction;
        console.log("direction = %s", direction);
        let res = await bus.getStop(searchRoute[senderID], direction);

        let stops = "";
        for(let stop of res.data[0].Stops) {
          stops = stops + `${stop.StopSequence}. ${stop.StopName.Zh_tw}\n`
        }
        await event.reply("請選擇查詢車站，輸入前方號碼即可查詢。\n\n"+stops);
        step[senderID] = 3;
      }
    } catch (error) {
      console.log(error);
    }

 });
  
 async function searchButton (msg, senderID, event){
  if(msg == '查詢') {
    step[senderID] = 1;
    await event.reply('歡迎使用台中公車查詢系統\n請輸入要查詢的路線號碼');
  } else if (step[senderID] == 1) {
    try {
      let route = await bus.getRoute(msg);
      let go = `去程往 ${route.data[0].DestinationStopNameZh} 方向`;
      let back = `回程往 ${route.data[0].DepartureStopNameZh} 方向`;
      await event.reply(formatQuickReply("請選擇去程回程",[go,back]));
      searchRoute[senderID] = msg;
      step[senderID] = 2;
    } catch (error) {
      console.log(error);
      await event.reply("您所輸入的路線不存在，請重新輸入");
    }
  } else if (step[senderID] == 3) {
    try {
      let res = await bus.getEstimateTime(searchRoute[senderID], searchDirection[senderID], msg);
      await event.reply(formatEstimatedTimeOfArrival(res.data[0]));
      step[senderID] = 0;
      start[senderID] = 0;
    } catch (error) {
      await event.reply("您所輸入的站牌號碼不存在，請重新輸入");
    }
  }
 }

 async function settingRoute(msg, senderID, event) {
   console.log(event);
   let user = await userService.findByLineId(senderID);
   if(!user) {
     user = await userService.create({ lineId: senderID });
   }
   let favorites = await favoriteService.findByUserId(user.id);
  if(msg == '設定常用站牌') {
    if(favorites.length < 1) {
      step[senderID] = 1;
      await event.reply('請輸入常用站牌的路線號碼');
    } else {
      step[senderID] = 1;
      await settingMiddleware(msg, senderID, event)
    }
  } else if (step[senderID] == 1) {
    try {
      let route = await bus.getRoute(msg);
      let go = `去程往 ${route.data[0].DestinationStopNameZh} 方向`;
      let back = `回程往 ${route.data[0].DepartureStopNameZh} 方向`;
      await event.reply(formatQuickReply("請選擇去程回程",[go,back]));
      searchRoute[senderID] = msg;
      step[senderID] = 2;
    } catch (error) {
      console.log(error);
      await event.reply("您所輸入的路線不存在，請重新輸入");
    }
  } else if (step[senderID] == 3) {
    try {
      let res = await bus.getEstimateTime(searchRoute[senderID], searchDirection[senderID], msg);
      const { StopName, StopID } = res.data[0];
      console.log(res.data[0]);
      await favoriteService.create({
        routeId: searchRoute[senderID],
        direction: searchDirection[senderID],
        stopId: StopID,
        stopName: StopName.Zh_tw,
        UserId: user.id
      });
      await event.reply(`已新增${searchRoute[senderID]} ${searchDirection[senderID]?"回程": "去程"} ${StopName.Zh_tw} 為常用站牌`);
      step[senderID] = 0;
      start[senderID] = 0;
    } catch (error) {
      console.log(error);
      await event.reply("您所輸入的站牌號碼不存在，請重新輸入");
    }
  }
 }

 async function settingMiddleware(msg, senderID, event) {
  console.log("msg = ", msg);
  let user = await userService.findByLineId(senderID);
  let favorites = await favoriteService.findByUserId(user.id);
  if(step[senderID] == 1) {
    await event.reply('您可以新增、編輯或刪除常用站牌。請根據您要進行的設定，輸入對應的號碼。\n\n' +
    '1.新增： 設定新的常用站牌\n2.刪除：移除先前設定的常用站牌\n\n 0.取消');
    start[senderID] = 3;
    step[senderID] = 2;
  } else if (step[senderID] == 2) {
    let deleteMsg = "請選擇您想要刪除的常用站牌。\n\n";
    for(let i = 1; i <= favorites.length; i++) {
      const favorite = favorites[i-1];
      deleteMsg += `${i}. ${favorite.routeId} ${favorite.direction?"回程": "去程"} ${favorite.stopName}\n`;
    }
    deleteMsg += '\n0.取消';
    switch(msg) {
      case '0': await event.reply('已取消，若要重新設定請點選選單'),start[senderID] = 0, step[senderID] = 0;
      break;
      case '1': await event.reply('請輸入常用站牌的路線號碼'), start[senderID] = 2, step[senderID] = 1;
      break;
      case '2': await event.reply(deleteMsg), start[senderID] = 4, step[senderID] = 1;
      break;
      default: await event.reply('輸入內容不正確。請輸入顯示的數字');
    }
  }
 }

 async function deleteFlow(msg, senderID, event) {
    let user = await userService.findByLineId(senderID); 
    let favorites = await favoriteService.findByUserId(user.id);
    if(!isNaN(msg)) {
      if(msg-1 < 0) {
        await event.reply('已取消，若要重新設定請點選選單')
        start[senderID] = 0
        step[senderID] = 0 
        return;
      }
      try {
        await favoriteService.destroyById(favorites[msg-1].id);
        await event.reply('刪除成功');
        start[senderID] = 0;
        step[senderID] = 0;
      } catch(error) {
        console.log(error);
        await event.reply('輸入內容不正確。請輸入顯示的數字');
      }
    } else {
      await event.reply('輸入內容不正確。請輸入顯示的數字');
    }
 }
  const app = express();
  const linebotParser = bot.parser();
  app.post('/', linebotParser);
  
  var server = app.listen(process.env.PORT || 8080, function() {
    var port = server.address().port;
    console.log("App now running on port", port);
  });

  models.sequelize.sync().then(function() {
    /**
     * Listen on provided port, on all network interfaces.
     */
    // server.listen(port, function() {
    //   // debug('Express server listening on port ' + server.address().port);
    // });
    // server.on('error', onError);
    // server.on('listening', onListening);
  });