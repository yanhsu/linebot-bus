const jsSHA = require('jssha');
const moment = require('moment-timezone');
const config = require('config');
module.exports.getAuthorizationHeader = () => {
	var AppID = process.env.AppID || config.AppID;
	var AppKey = process.env.AppKey || config.AppKey;
    
	var GMTString = new Date().toGMTString();
	var ShaObj = new jsSHA('SHA-1', 'TEXT');
	ShaObj.setHMACKey(AppKey, 'TEXT');
	ShaObj.update('x-date: ' + GMTString);
	var HMAC = ShaObj.getHMAC('B64');
	var Authorization = 'hmac username=\"' + AppID + '\", algorithm=\"hmac-sha1\", headers=\"x-date\", signature=\"' + HMAC + '\"';
    
	return { 'Authorization': Authorization, 'X-Date': GMTString};
};

module.exports.formatQuickReply = (title, replies, actionType, templateType) => {
  let actions = [];
  for(let reply of replies) {
    actions.push({
      type: actionType,
      label: reply,
      data: reply,
      mode: 'time'
    })
  }
	let message = {
    type: 'template',
    altText: title,
    template: {
      type: templateType,
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
  if(StopStatus == 2) {
    return "交管不停靠"
  } else if(StopStatus == 3) {
    return "末班車已駛離"
  } else if(StopStatus == 4) {
    return "今日未營運"
  } else if(PlateNumb == -1 || !PlateNumb) {
    return `下班車預計抵達時間${nextTime}`
  }  else {
    return `車號 ${PlateNumb}\n 將在${min}分鐘後抵達`
  }
}