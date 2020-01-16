const linebot = require('linebot');
const express = require('express');
const bus = require('./bus/route');
const models = require('./models');
const config = require('config');
const Service = require('./services');
const https = require("https");
const cron = require('node-cron');
const moment = require('moment-timezone');
global.Service = new Service();
const { channelId, channelAccessToken, channelSecret} = config;
const { formatQuickReply, formatEstimatedTimeOfArrival, formatFlexMessage,formatBusFlexMessage } = require('./util/common');

setInterval(function() {
  https.get("https://taichungbus.herokuapp.com/");
  console.log("get success");
}, 600001);

let bot = linebot({
    channelId: process.env.ChannelId || channelId,
    channelSecret: process.env.ChannelSecret || channelSecret,
    channelAccessToken: process.env.ChannelAccessToken || channelAccessToken
});

// console.log("process env === %O", process.env.Connection.options);
 
var start = {};//查詢是否開始
var step = {};//查詢到第幾個步驟了
var searchRoute = {}; // 查詢路線
var searchDirection = {} // 查詢方向
var searchStop = {}; // 查詢站點
var favoriteId = {}; // 常用站牌ID
var branch = {
  "查詢": 1,
  "設定常用站牌": 2,
  "常用站牌": 5
};
bot.on('message', async function(event) {
    const senderID = event.source.userId;
    console.log(start[senderID]);
    if (event.message.type = 'text') {
      let msg = event.message.text.trim();
      if(start[senderID]!=0 && start[senderID]!= undefined) {
        switch(start[senderID]) {
          case 1: await searchButton(msg, senderID, event); // 查詢
          break;
          case 2: await settingRoute(msg, senderID, event); // 設定路線
          break;
          case 3: await settingMiddleware(msg, senderID, event); // 已有路線詢問設定
          break;
          case 4: await deleteFlow(msg, senderID, event); // 刪除流程
          break;
          case 5: await searchByFavorite(msg, senderID, event);// 常用搜尋
          break;
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
          case 5: await searchByFavorite(msg, senderID, event);
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
        if(msg.indexOf("取消") >= 0) {
          start[senderID] = 0, step[senderID] = 0;
          await event.reply("已取消，若要重新查詢請點選選單");
        }
        searchDirection[senderID] = direction;
        console.log("direction = %s", direction);
        // let res = await bus.getStop(searchRoute[senderID], direction);
        let res = await  bus.getAllEstimateTimeByRouteId(searchRoute[senderID], direction);
        try {
          await new Promise(function (resolve, reject) {
            try {
              event.reply(formatBusFlexMessage(searchRoute[senderID],res.data));
              console.log("flex => %s",JSON.stringify(formatBusFlexMessage(searchRoute[senderID],res.data)));
              resolve();
              // step[senderID] = 3;
            } catch (err) {
              reject(err)
            }
          });
        } catch(err) {
          console.log("err => %s", err);
          await event.reply("發生錯誤，請與偷懶的開發人員連繫");
        }

      }
      // if (step[senderID] == 3) {
      //   try {
      //     console.log("step3 = %o", event);
      //     let res = await bus.getEstimateTime(searchRoute[senderID], searchDirection[senderID], msg);
      //     await event.reply(formatEstimatedTimeOfArrival(res.data[0]));
      //     step[senderID] = 0;
      //     start[senderID] = 0;
      //   } catch (error) {
      //     await event.reply("您所輸入的站牌號碼不存在，請重新輸入");
      //   }
      // }
      if(step[senderID] == 4) {
        if(msg.indexOf("是") >= 0) {
          let replyButton = "點擊選取時間";
          await event.reply(formatQuickReply("請選擇時間",[replyButton], 'datetimepicker','buttons'));
          step[senderID] = 5;
        } else {
          await event.reply(`感謝您的使用\n 若要重新查詢請按下方選單`);
          start[senderID] = 0;
          step[senderID] = 0;
        }
      }
      if(step[senderID] == 5) {
        let time = event.postback.params.time;
        try {
          if(/^(?:2[0-3]|[01][0-9]):[0-5][0-9]$/.test(time)) {
            await favoriteService.updateTimeByFavoriteId(favoriteId[senderID].id,  time);
            await event.reply(`您設定的時間為${msg}\n 若要重新設定請點選下方選單。`);
            start[senderID] = 0;
            step[senderID] = 0;
          } else {
            await event.reply("時間格式錯誤，請重新輸入。");
          }
        } catch(err) {
          console.log(err);
          await event.reply("發生非預期錯誤，請洽開發人員!!");
        }
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
      let route = await bus.getRoute(msg.trim());
      let go = `去程往 ${route.data[0].DestinationStopNameZh} 方向`;
      let back = `回程往 ${route.data[0].DepartureStopNameZh} 方向`;
      await event.reply(formatQuickReply("請選擇去程回程",[go,back,"取消查詢"], 'postback', 'buttons'));
      searchRoute[senderID] = msg;
      step[senderID] = 2;
    } catch (error) {
      console.log(error);
      await event.reply("您所輸入的路線不存在，請重新輸入");
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
      await event.reply(formatQuickReply("請選擇去程回程",[go,back], 'postback','buttons'));
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

      favoriteId[senderID] = await favoriteService.create({
        routeId: searchRoute[senderID],
        direction: searchDirection[senderID],
        stopId: StopID,
        stopName: StopName.Zh_tw,
        UserId: user.id
      });
      await event.reply(formatQuickReply(`已新增${searchRoute[senderID]} ${searchDirection[senderID]?"回程": "去程"} ${StopName.Zh_tw} 為常用站牌\n是否開啟定時推播`,["是","否"],'postback','buttons'));
      // step[senderID] = 0;
      // start[senderID] = 0;
      step[senderID] = 4;
    } catch (error) {
      console.log(error);
      await event.reply("您所輸入的站牌號碼不存在，請重新輸入");
    }
  } else if(step[senderID] == 5) {
    try {
      if(/^(?:2[0-3]|[01][0-9]):[0-5][0-9]$/.test(msg)) {
        await favoriteService.updateTimeByFavoriteId(favoriteId[senderID].id,  msg);
        await event.reply(`您設定的時間為${msg}\n 若要重新設定請點選下方選單。`);
      } else {
        await event.reply("時間格式錯誤，請重新輸入。");
      }
    } catch(err) {
      console.log(err);
      await event.reply("發生非預期錯誤，請洽開發人員!!");
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
        start[senderID] = 0;
        step[senderID] = 0;
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

 async function searchByFavorite(msg, senderID, event) {
   console.log("常用站牌 ===");
  let user = await userService.findByLineId(senderID);
  if(!user) {
    user = await userService.create({ lineId: senderID });
  }
  let favorites = await favoriteService.findByUserId(user.id);
  if(msg == '常用站牌') {
    if(favorites.length < 1) {
      await event.reply('您尚未設定，常用站牌，請至選單設定。');
      step[senderID] = 0;
      start[senderID] = 0;
    } else {
      let chooseMsg = '請選擇您要查詢的站牌\n\n';
      for(let i = 1; i <= favorites.length; i++) {
        const favorite = favorites[i-1];
        chooseMsg += `${i}. ${favorite.routeId} ${favorite.direction?"回程": "去程"} ${favorite.stopName}\n`;
      }
      chooseMsg += '\n0.取消';
      await event.reply(chooseMsg);
      step[senderID] = 1;
    }
  } else if(step[senderID] == 1) {
    if(!isNaN(msg)) {
      if(msg-1 < 0) {
        await event.reply('已取消，若要重新設定請點選選單')
        start[senderID] = 0;
        step[senderID] = 0;
        return;
      }
      try {
        let favorite = favorites[msg-1];
        let res = await bus.getEstimateTimeByStopId(favorite.routeId, favorite.direction, favorite.stopId);
        await event.reply(formatEstimatedTimeOfArrival(res.data[0]));
        step[senderID] = 0;
        start[senderID] = 0;
      } catch(error) {
        console.log(error);
        await event.reply('輸入內容不正確。請輸入顯示的數字');
      }
    } else {
      await event.reply('輸入內容不正確。請輸入顯示的數字');
    }
  }
 }
 cron.schedule('*/1 * * * *', async () => {
  const timeNow = moment().tz("Asia/Taipei").format("HH:mm");
  const favorites = await favoriteService.findByTriggerTime(timeNow);
  for(let favorite of favorites) {
    let res = await bus.getEstimateTimeByStopId(favorite.routeId, favorite.direction, favorite.stopId);
    const msg = formatEstimatedTimeOfArrival(res.data[0]);
    bot.push(favorite.User.lineId, `${favorite.routeId}路公車 \n${res.data[0].StopName.Zh_tw}站 ${msg}`);
  }

  console.log('running on every minute');
});
  const app = express();
  const linebotParser = bot.parser();
  app.post('/', linebotParser);
  
  var server = app.listen(process.env.PORT || 9006, function() {
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