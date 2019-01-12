const linebot = require('linebot');
const express = require('express');
const bus = require('./bus/route');
const config = require('config')
const { formatQuickReply, formatEstimatedTimeOfArrival } = require('./util/common')

let bot = linebot({
    channelId: process.env.ChannelId,
    channelSecret: process.env.ChannelSecret,
    channelAccessToken: process.env.ChannelAccessToken
});

console.log("process env === %O", process.env);
 
var start = {};//查詢是否開始
var step = {};//查詢到第幾個步驟了
var searchRoute = {}; // 查詢路線
var searchDirection = {} // 查詢方向
var searchStop = {}; // 查詢站點

bot.on('message', async function(event) {
    const senderID = event.source.userId;
    console.log(event);
    if (event.message.type = 'text') {
      let msg = event.message.text;
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
            await event.reply("您所輸入的路線不存在，請重新輸入");
          }
        } else if (step[senderID] == 3) {
          try {
            let res = await bus.getEstimateTime(searchRoute[senderID], searchDirection[senderID], msg);
            await event.reply(formatEstimatedTimeOfArrival(res.data[0]));
            step[senderID] = 0;
          } catch (error) {
            await event.reply("您所輸入的站牌號碼不存在，請重新輸入");
          }
        }
        console.log(msg);
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
  
  const app = express();
  const linebotParser = bot.parser();
  app.post('/', linebotParser);
  
  var server = app.listen(process.env.PORT || 8080, function() {
    var port = server.address().port;
    console.log("App now running on port", port);
  });