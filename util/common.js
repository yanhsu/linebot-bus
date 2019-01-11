const jsSHA = require('jssha');
const moment = require('moment-timezone');
const config = require('config');

module.exports.getAuthorizationHeader = () => {
	var AppID = process.env.AppID;
	var AppKey = process.env.AppKey;
    
	var GMTString = new Date().toGMTString();
	var ShaObj = new jsSHA('SHA-1', 'TEXT');
	ShaObj.setHMACKey(AppKey, 'TEXT');
	ShaObj.update('x-date: ' + GMTString);
	var HMAC = ShaObj.getHMAC('B64');
	var Authorization = 'hmac username=\"' + AppID + '\", algorithm=\"hmac-sha1\", headers=\"x-date\", signature=\"' + HMAC + '\"';
    
	return { 'Authorization': Authorization, 'X-Date': GMTString};
};

module.exports.formatQuickReply = (title, replies) => {
  let actions = [];
  for(let reply of replies) {
    actions.push({
      type: 'postback',
      label: reply,
      data: reply
    })
  }
	let message = {
    type: 'template',
    altText: title,
    template: {
      type: 'buttons',
      text: title,
      actions: actions
    }
  }
  return message;
}

module.exports.formatEstimatedTimeOfArrival = (estimatedTimeOfArrival) => {
  const {
    PlateNumb,
    EstimateTime,
    StopStatus,
    NextBusTime
  } = estimatedTimeOfArrival;
  let min;
  if(EstimateTime > 0) {
    min = EstimateTime/60;
  }
  let nextTime = moment(NextBusTime).tz("Asia/Taipei").format("HH:mm");
  if(PlateNumb == -1 || !PlateNumb) {
    return `尚未發車\n下班車預計抵達時間${nextTime}`
  } else if(StopStatus != 0) {
    return "尚未發車"
  } else {
    return `車號 ${PlateNumb}\n 將在${min}分鐘後抵達`
  }
}