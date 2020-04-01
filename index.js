const linebot = require('linebot');
const express = require('express');
const bus = require('./bus/route');
const models = require('./models');
const config = require('config');
const Service = require('./services');
const https = require("https");
const cron = require('node-cron');
const NodeCache = require('node-cache');
const myCache = new NodeCache();
global.Service = new Service();
const { channelId, channelAccessToken, channelSecret} = config;
const { formatQuickReply, formatEstimatedTimeOfArrival,formatBusFlexMessage, formatFlexMessage } = require('./util/common');

setInterval(function() {
  https.get("https://taichungbus.herokuapp.com/");
  console.log("get success");
}, 600001);

let bot = linebot({
    channelId: process.env.ChannelId || channelId,
    channelSecret: process.env.ChannelSecret || channelSecret,
    channelAccessToken: process.env.ChannelAccessToken || channelAccessToken
});

 
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
    // console.log(start[senderID]);
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
    // console.log(event);
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
              let replymsg = formatBusFlexMessage(searchRoute[senderID],res.data);
              // console.log(JSON.stringify(replymsg));
              event.reply(replymsg);
              resolve();
              // step[senderID] = 3;
            } catch (err) {
              reject(err)
            }
          });
          step[senderID] = 0;
          start[senderID] = 0;
        } catch(err) {
          console.log("err => %s", err);
          await event.reply("發生錯誤，請與偷懶的開發人員連繫");
        }

      }
      if(step[senderID] == 2.1) {
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
          let res = await  bus.getStop(searchRoute[senderID], direction);
          try {
            let isResolve = await new Promise(async function (resolve, reject) {
              try {
                let replymsg = formatFlexMessage(searchRoute[senderID],res.data[0].Stops,"StopName.Zh_tw","StopSequence");
                // console.log(JSON.stringify(replymsg));
                await event.reply(replymsg);
                resolve(true);
              } catch (err) {
                console.log(err);
                reject(false);
              }
            });
            if(isResolve) {
              step[senderID] = 2.3;
            }
          } catch(err) {
            console.log("err => %s", err);
            await event.reply("發生錯誤，請與偷懶的開發人員連繫");
          }
      }
      else if (step[senderID] == 2.3) {
        try {
          // console.log("2.3 =>" + msg);
          let res = await bus.getEstimateTime(searchRoute[senderID], searchDirection[senderID], msg);
          const { StopName, StopID } = res.data[0];
          let user = await userService.findByLineId(senderID);
          favoriteId[senderID] = await favoriteService.create({
            routeId: searchRoute[senderID],
            direction: searchDirection[senderID],
            stopId: StopID,
            stopName: StopName.Zh_tw,
            UserId: user.id
          });
          let isResolve = await new Promise(async function (resolve, reject) {
            try{
              await event.reply(formatQuickReply(`已新增${searchRoute[senderID]} ${searchDirection[senderID]?"回程": "去程"} ${StopName.Zh_tw} 為常用站牌\n是否開啟定時推播`,["是","否"],["是","否"],'postback','buttons'));
              resolve(true);
            } catch(err) {
              console.log(err);
              reject(false);
            }
          });
          console.log(event);
          if(isResolve) {
            step[senderID] = 2.4;
          }
          // step[senderID] = 0;
          // start[senderID] = 0;
        } catch (error) {
          console.log(error);
          await event.reply("您所輸入的站牌號碼不存在，請重新輸入");
        }
      }
      else if(step[senderID] == 2.4) {
        // console.log("2.4 => %O",event);
        if(msg.indexOf("是") >= 0) {
          let replyButton = "點擊選取時間";
          await event.reply(formatQuickReply("請選擇時間",[replyButton],[replyButton], 'datetimepicker','buttons'));
          step[senderID] = 2.5;
        } else {
          await event.reply(`感謝您的使用\n 若要重新查詢請按下方選單`);
          start[senderID] = 0;
          step[senderID] = 0;
        }
      }
      else if(step[senderID] == 2.5) {
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
      else if (step[senderID] == 3.2) {
        let user = await userService.findByLineId(senderID);
        let favorites = await favoriteService.findByUserId(user.id);
        let deleteMsg = "請選擇您想要刪除的常用站牌。\n\n";
        let deleteFavorites = [];
        for(let i = 1; i <= favorites.length; i++) {
          const favorite = favorites[i-1];
          let routeInfo = myCache.get(favorite.routeId);
          deleteFavorites.push({ index: i, content: `${favorite.routeId} ${favorite.direction?`往${routeInfo.destinationStopName}`:`往${routeInfo.departureStopName}` } ${favorite.stopName}`})
          deleteMsg += `${i}. ${favorite.routeId} ${favorite.direction?`往${routeInfo.destinationStopName}`:`往${routeInfo.departureStopName}` } ${favorite.stopName}\n`;
        }
        deleteMsg += '\n0.取消';
        deleteFavorites.push({index: 0, content: `取消刪除`});
        switch(msg) {
          case '0': await event.reply('已取消，若要重新設定請點選選單'),start[senderID] = 0, step[senderID] = 0;
            break;
          case '1': await event.reply('請輸入常用站牌的路線號碼'), start[senderID] = 2, step[senderID] = 1;
            break;
          case '2': await event.reply(formatFlexMessage(`請選擇您想要刪除的常用站牌`,deleteFavorites,`content`,`index`)),step[senderID] = 4.1;
            break;
          default: await event.reply('輸入內容不正確。請輸入顯示的數字');
        }
      }
      else if(step[senderID] == 4.1) {
        await deleteFlow(msg, senderID, event);
        await event.reply('刪除成功');
      }
      else if(step[senderID] == 6) {
        if(msg == 0) {
          await event.reply('已取消，若要重新查詢請點選選單'),start[senderID] = 0, step[senderID] = 0;
        } else {
          let data = msg.split(",");
          console.log(data);
          let res = await bus.getEstimateTimeByStopId(data[0], data[1], data[2]);
          await event.reply(formatEstimatedTimeOfArrival(res.data[0]));
          step[senderID] = 0;
          start[senderID] = 0;
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
      // let route = await bus.getRoute(msg.trim());
      let route = myCache.get(msg.trim());
      let go = `去程往 ${route.destinationStopName} 方向`;
      let back = `回程往 ${route.departureStopName} 方向`;
      await event.reply(formatQuickReply("請選擇去程回程",[go,back,"取消查詢"], [go,back,"取消查詢"],'postback', 'buttons'));
      searchRoute[senderID] = msg;
      step[senderID] = 2;
    } catch (error) {
      console.log(error);
      await event.reply("您所輸入的路線不存在，請重新輸入");
    }
  }
 }

 async function settingRoute(msg, senderID, event) {
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
      let route = myCache.get(msg.trim());
      let go = `去程往 ${route.destinationStopName} 方向`;
      let back = `回程往 ${route.departureStopName} 方向`;
      let cancel = `取消查詢`;
      await event.reply(formatQuickReply("請選擇去程回程",[go,back,cancel],[go,back,cancel], 'postback','buttons'));
      searchRoute[senderID] = msg;
      step[senderID] = 2.1;
    } catch (error) {
      console.log(error);
      await event.reply("您所輸入的路線不存在，請重新輸入");
    }
  }
    else if (step[senderID] == 3) {
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
      await event.reply(formatQuickReply(`已新增${searchRoute[senderID]} ${searchDirection[senderID]?"回程": "去程"} ${StopName.Zh_tw} 為常用站牌\n是否開啟定時推播`,["是","否"],["是","否"],'postback','buttons'));
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
    // await event.reply('您可以新增、編輯或刪除常用站牌。請根據您要進行的設定，輸入對應的號碼。\n\n' +
    //     // '1.新增： 設定新的常用站牌\n2.刪除：移除先前設定的常用站牌\n\n 0.取消');
    await event.reply(formatQuickReply('您可以新增、編輯或刪除常用站牌',['新增','刪除','取消'],['1','2','0'],'postback','buttons'))
    start[senderID] = 3;
    step[senderID] = 3.2;
  } else if (step[senderID] == 3.2) {
    let deleteMsg = "請選擇您想要刪除的常用站牌。\n\n";
    for(let i = 1; i <= favorites.length; i++) {
      const favorite = favorites[i-1];
      let routeInfo = myCache.get(favorite.routeId);
      deleteMsg += `${i}. ${favorite.routeId} ${favorite.direction?`往${routeInfo.destinationStopName}`:`往${routeInfo.departureStopName}` } ${favorite.stopName}\n`;
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
    console.log("delete flow");
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
      // let chooseMsg = '請選擇您要查詢的站牌\n\n';
      const myFavorites = [];
      for(let i = 1; i <= favorites.length; i++) {
        const favorite = favorites[i-1];
        let routeInfo = myCache.get(favorite.routeId);
        myFavorites.push({ index: `${favorite.routeId},${favorite.direction},${favorite.stopId}`, content: `${favorite.routeId} ${favorite.stopName} \n ${favorite.direction?`往${routeInfo.destinationStopName}`:`往${routeInfo.departureStopName}` } `})
        // chooseMsg += `${i}. ${favorite.routeId} ${favorite.direction?"回程": "去程"} ${favorite.stopName}\n`;
      }
      myFavorites.push({index: 0, content: `取消查詢`});
      // chooseMsg += '\n0.取消';
      await event.reply(formatFlexMessage(`請選擇您想要查詢的常用站牌`,myFavorites,`content`,`index`))
      step[senderID] = 6;
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
  await cronService.pushFavoriteStop(bot);
  // console.log('running on every minute');
});
 cron.schedule('0 5 * * *',async () => {
   cache.flushAll();
   await cronService.updateRouteInfo();
   await cronService.setCache(myCache);
 })
  const app = express();
  const linebotParser = bot.parser();
  app.post('/', linebotParser);
  
  global.server = app.listen(process.env.PORT || 9006, async function() {
    let port = server.address().port;
    console.log("App now running on port", port);
    await cronService.setCache(myCache);
  });

  models.sequelize.sync().then(async function() {
    /**
     * Listen on provided port, on all network interfaces.
     */
    // server.listen(port, function() {
    //   debug('Express server listening on port ' + server.address().port);
    // });
    // server.on('error', onError);
    // server.on('listening', onListening);
  });