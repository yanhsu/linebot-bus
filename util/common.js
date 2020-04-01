const jsSHA = require('jssha');
const moment = require('moment-timezone');
const config = require('config');
const _ = require('lodash');

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

module.exports.formatQuickReply = (title, replies,data, actionType, templateType) => {
  let actions = [];
  for(let [i,reply] of replies.entries()) {
    actions.push({
      type: actionType,
      label: reply,
      data: data[i],
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

module.exports.formatFlexMessage = (title, contents, labelName, dataName) => {
  const flexTemplate = {
    "type": "flex",
    "altText": "台中等公車",
    "contents": null
  }
  let template = {
    "type": "bubble",
    "size": "giga",
    "body": {
      "type": "box",
      "layout": "vertical",
      "spacing": "md",
      "contents": [
        {
          "type": "text",
          "text": title,
          "weight": "bold",
          "color": "#1DB446",
          "size": "md"
        },
      ]
    }
  }
  for(let [i,content] of contents.entries()) {
    template.body.contents.push({
      "type": "button",
      "style": i%2 ?"primary": "secondary",
      "action": {
        "type": "postback",
        "label": labelName == "StopName.Zh_tw"?content["StopName"]["Zh_tw"]:content[labelName],//StopName.Zh_tw
        "data": content[dataName] //StopSequence
      }
    });
  }
  flexTemplate.contents = template;
  return flexTemplate;
}

module.exports.formatBusFlexMessage = (routeName, stops) => {
  formatEstimatedTimeOfArrival = (estimatedTimeOfArrival) => {

    const {
      PlateNumb,
      EstimateTime,
      StopStatus,
      NextBusTime
    } = estimatedTimeOfArrival;
    let min;
    if (EstimateTime > 0) {
      min = EstimateTime / 60;
    }
    let nextTime = moment(NextBusTime).tz("Asia/Taipei").format("HH:mm");
    if (StopStatus == 2) {
      return "交管不停靠"
    } else if (StopStatus == 3) {
      return "末班車已駛離"
    } else if (StopStatus == 4) {
      return "今日未營運"
    } else if (PlateNumb == -1 || !PlateNumb) {
      return `${nextTime}`
    } else if(EstimateTime == 0){
      return `進站中`
    }else {
      return `${min}分鐘後抵達`
    }
  }
  let template = {
    "type": "bubble",
    "header": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "text",
              "text": `${routeName} 往${stops[stops.length - 1].StopName.Zh_tw}`,
              "color": "#666666",
              "size": "lg",
              "decoration": "none",
              "style": "normal",
              "weight": "bold",
              "align": "center",
              "gravity": "center",
              "wrap": false
            }
          ]
        }
      ],
      "paddingAll": "10px",
      "backgroundColor": "#10E000",
      "spacing": "md"
    },
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
      ]
    }
  }
  const flexTemplate = {
    "type": "flex",
    "altText": "台中等公車",
    "contents": null
  }
  const carouselTemplate = {
    "type": "carousel",
    "contents": [
    ]
  }
  let page;
  let perpageLimit = 25;
  if(stops.length % perpageLimit == 0) {
    page = parseInt(stops.length/perpageLimit);
  } else {
    page = parseInt(stops.length/perpageLimit) + 1;
  }

  for(j = 0; j < page; j++) {
    let templateWithoutHeader = _.cloneDeep(template);
    delete templateWithoutHeader.header;
    if(j == 0) {
      carouselTemplate.contents.push(_.cloneDeep(template));
    } else {
      carouselTemplate.contents.push(_.cloneDeep(templateWithoutHeader));
    }
    console.log(carouselTemplate.contents[j].body.contents.length);
    for(i = j * perpageLimit; i< (j+1) * perpageLimit; i++){
      if(i < stops.length) {
        carouselTemplate.contents[j].body.contents.push({
          "type": "box",
          "layout": "horizontal",
          "contents": [
            {
              "type": "text",
              "text": formatEstimatedTimeOfArrival(stops[i]),
              "size": "sm",
              "flex": 3
            },
            {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "filler"
                },
                {
                  "type": "box",
                  "layout": "vertical",
                  "contents": [
                    {
                      "type": "filler"
                    }
                  ],
                  "cornerRadius": "20px",
                  "width": "13px",
                  "height": "13px",
                  "borderColor": stops[i] && stops[i].EstimateTime && stops[i].EstimateTime/60 < 6?"#00FF00": "#FF2200",
                  "borderWidth": "2px"
                },
                {
                  "type": "filler"
                }
              ],
              "flex": 1
            },
            {
              "type": "text",
              "text": stops[i].StopName.Zh_tw,
              "gravity": "center",
              "flex": 7,
              "size": "sm"
            }
          ],
          "spacing": "md",
          "cornerRadius": "30px"
        },);
      }
    }

  }


  // for(let [i,stop] of stops.entries()) {
  //     template.body.contents.push(
  //       {
  //         "type": "box",
  //         "layout": "horizontal",
  //         "contents": [
  //           {
  //             "type": "text",
  //             "text": formatEstimatedTimeOfArrival(stop),
  //             "size": "sm",
  //             "flex": 3
  //           },
  //           {
  //             "type": "box",
  //             "layout": "vertical",
  //             "contents": [
  //               {
  //                 "type": "filler"
  //               },
  //               {
  //                 "type": "box",
  //                 "layout": "vertical",
  //                 "contents": [
  //                   {
  //                     "type": "filler"
  //                   }
  //                 ],
  //                 "cornerRadius": "20px",
  //                 "width": "13px",
  //                 "height": "13px",
  //                 "borderColor": "#FF2200",
  //                 "borderWidth": "2px"
  //               },
  //               {
  //                 "type": "filler"
  //               }
  //             ],
  //             "flex": 1
  //           },
  //           {
  //             "type": "text",
  //             "text": stop.StopName.Zh_tw,
  //             "gravity": "center",
  //             "flex": 7,
  //             "size": "sm"
  //           }
  //         ],
  //         "spacing": "md",
  //         "cornerRadius": "30px"
  //       },
  //     );
  //     // if (i != stops.length - 1) {
  //     //   template.body.contents.push(
  //     //     {
  //     //       "type": "box",
  //     //       "layout": "horizontal",
  //     //       "contents": [
  //     //         {
  //     //           "type": "box",
  //     //           "layout": "vertical",
  //     //           "contents": [
  //     //             {
  //     //               "type": "box",
  //     //               "layout": "horizontal",
  //     //               "contents": [
  //     //                 {
  //     //                   "type": "box",
  //     //                   "layout": "baseline",
  //     //                   "contents": [
  //     //                     {
  //     //                       "type": "filler"
  //     //                     }
  //     //                   ],
  //     //                   "flex": 3
  //     //                 },
  //     //                 {
  //     //                   "type": "box",
  //     //                   "layout": "horizontal",
  //     //                   "contents": [
  //     //                     {
  //     //                       "type": "box",
  //     //                       "layout": "horizontal",
  //     //                       "contents": [
  //     //                         {
  //     //                           "type": "filler",
  //     //                           "flex": 8
  //     //                         },
  //     //                         {
  //     //                           "type": "box",
  //     //                           "layout": "baseline",
  //     //                           "contents": [
  //     //                             {
  //     //                               "type": "text",
  //     //                               "text": " "
  //     //                             }
  //     //                           ],
  //     //                           "backgroundColor": "#000000",
  //     //                           "flex": 1
  //     //                         },
  //     //                         {
  //     //                           "type": "filler",
  //     //                           "flex": 11
  //     //                         }
  //     //                       ]
  //     //                     }
  //     //                   ],
  //     //                   "flex": 1
  //     //                 },
  //     //                 {
  //     //                   "type": "box",
  //     //                   "layout": "baseline",
  //     //                   "contents": [
  //     //                     {
  //     //                       "type": "filler"
  //     //                     }
  //     //                   ],
  //     //                   "flex": 7
  //     //                 }
  //     //               ],
  //     //               "flex": 1
  //     //             }
  //     //           ]
  //     //         }
  //     //       ],
  //     //       "spacing": "lg",
  //     //       "height": "19px"
  //     //     }
  //     //   );
  //     // }
  // }
  flexTemplate.contents = carouselTemplate;
  return flexTemplate;
}