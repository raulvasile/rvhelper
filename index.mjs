'use strict';

import fetch from 'isomorphic-fetch';
import { topic } from './communication';
import { _, setupI18n } from './i18n';

const REQUEST_STATUS_SUCCESS = 'success';
const REQUEST_STATUS_ERROR = 'error';

const outgoingRequests = {};
const cacheStore = {};
const outgoingRequestsParsedBody = {};

const resType = 'json';

const getResponseFromCache = (cacheKey) => {
  return new Promise((resolve, reject) => {
    if (cacheStore[cacheKey] && cacheStore[cacheKey].response) {
      return resolve(cacheStore[cacheKey].response);
    }

    return reject(new Error(`Unable to access cache for: ${cacheStore[cacheKey]}`));
  });
}

const checkStatus = (response) => {
  if (response.status < 200 || response.status >= 400) {
    // TODO we need a global error handler here
    throw new Error(`Error on request "${response.url}" (${response.status}: ${response.statusText})`);
  }

  return response;
}

const storeResponseInCache = (res, cacheKey) => {
  delete outgoingRequestsParsedBody[cacheKey];

  cacheStore[cacheKey] = {
    response: res
  };

  return cacheStore[cacheKey].response;
}

window.emWidgets.topic = topic;

// Internal use only
const validateFields = (config, required_fields, optional_fields, null_valid, zero_valid, empty_valid) => {
  let invalid_fields = [];
  let isOptional = false;

  required_fields.forEach((field) => {
    if (optional_fields.includes(field)) {
      isOptional = true;
    }

    if (field in config) {
      switch (config[field]) {
        case undefined:
          if (isOptional) {
            console.warn(field + ' exists but is undefined!');
          } else {
            console.error(field + ' exists but is undefined!');

            invalid_fields.push(field);
          }

          break;

        case '':
          if (isOptional) {
            console.warn(field + ' exists but is empty!');
          } else {
            console.error(field + ' exists but is empty!');

            if (empty_valid) {
              invalid_fields.push(field);
            }
          }

          break;

        case null:
          if (isOptional) {
            console.warn(field + ' exists but is null');
          } else {
            console.error(field + ' exists but is null');

            if (null_valid) {
              invalid_fields.push(field);
            }
          }

          break;

        case 0:
          if (isOptional) {
            console.warn(field + ' exists and the value is 0');
          } else {
            console.error(field + ' exists and the value is 0');

            if (zero_valid) {
              invalid_fields.push(field);
            }
          }

          break;

        default:
          // Nothing to do here :)
          break;
      }
    } else {
      console.error(field + " doesn't exist in ConfigObject");

      invalid_fields.push(field);
    }
  });

  return invalid_fields;
}

// start update section - recursively update customOperator object with data provided by client
const updateCustomOperatorObj = (targetObj, updateObj) => {
  for (let [key,value] of Object.entries(updateObj)) {
     // if targetObj has the relevant key and the type in targetObj and updateObj is the same
     if (targetObj.hasOwnProperty(key) && typeof(value) === typeof(targetObj[key])) {
       // update value if string,number or boolean
       if (['string','number','boolean'].includes(typeof value) || Array.isArray(value)) {
        targetObj[key] = value;
       } else {
         // if type is object then go one level deeper
         if (typeof value === 'object') {
          updateCustomOperatorObj(targetObj[key], value);
         }
       }
     }
  }
}

/**
 * @name xhrFetch
 * @description An overlay over fetch method to allow caching
 * @param url String - The URL you want to query
 * @param options Object -
      method(String): GET/POST/PUT/DELETE
      headers(Object): Request header params
      body(Object): Request body params
  @param cache Boolean - Variable to tell XHRFetch to cache or not the request
*/
const xhrFetch = (url, options = {}, cache = true) => {
  const cacheKey = `${url}`;
  const {
    method = 'GET',
    headers = {},
    body = {}
  } = options;
  const reqHeaders = new Headers();

  Object.keys(headers).forEach((item) => {
    reqHeaders.append(item, headers[item]);
  });

  reqHeaders.append('accept', 'application/json');
  reqHeaders.append('Content-Type', 'application/json');

  const reqOpts = {
    method,
    headers: reqHeaders
  };

  if (method === 'POST' || method === 'PUT') {
    reqOpts.body = JSON.stringify(body);
  }

  const request = new Request(url, reqOpts);

  let fetchPromise;

  if (cache === true && cacheStore[cacheKey]) {
    return getResponseFromCache(cacheKey);
  }

  if (outgoingRequests[cacheKey]) {
    fetchPromise = outgoingRequests[cacheKey];
  } else {
    fetchPromise = fetch(request);

    outgoingRequests[cacheKey] = fetchPromise;
  }

  return fetchPromise
    .then(checkStatus)
    .catch((err) => {
      return Promise.reject(err);
    })
    .then((res) => {
      delete outgoingRequests[cacheKey];

      if (!res.bodyUsed) {
        outgoingRequestsParsedBody[cacheKey] = res[resType]();
      }

      return outgoingRequestsParsedBody[cacheKey];
    })
    .then((res) => {
      return storeResponseInCache(res, cacheKey);
    });
}

/**
 * @name isMobile
 * @description A method that returns if the browser used to access the app is from a mobile device or not
 * @param {String} userAgent window.navigator.userAgent
 * @returns {Boolean} true or false
 */
const isMobile = (userAgent) => {
  return !!(
    userAgent.toLowerCase().match(/android/i) ||
    userAgent.toLowerCase().match(/blackberry|bb/i) ||
    userAgent.toLowerCase().match(/iphone|ipad|ipod/i) ||
    userAgent.toLowerCase().match(/windows phone|windows mobile|iemobile|wpdesktop/i)
  );
}

/**
 * @name getDevice
 * @description A method that returns the type of the device
 * @param {String} userAgent window.navigator.userAgent
 * @returns {String} Android/iPhone/iPad/PC
 */
const getDevice = (userAgent) => {
  if (userAgent.toLowerCase().match(/android/i)) {
    return 'Android';
  }

  if (userAgent.toLowerCase().match(/iphone/i)) {
    return 'iPhone';
  }

  if (userAgent.toLowerCase().match(/ipad|ipod/i)) {
    return 'iPad';
  }

  return 'PC';
}

/**
 * @name checkConfig
 * @description
 * @param
 * @returns {Boolean} true or false
 */
const checkConfig = (config) => {
  // fields to validate
  let fields = ['endpointURL', 'dataSource'];
  let optional = ['dataSource'];
  let invalid = validateFields(config, fields, optional, true, true, true);

  if (invalid.length > 0) {
    return false;
  }

  return true;
}

/**
 * @name getCustomOperatorData
 * @description This should be deprecated
 * @param
 * @returns {Object}
 */
const getCustomOperatorData = () => {
  updateCustomOperatorObj(customOperator, window.widgetConfig);

  return customOperator;
}

// separate favorites array into mobile and desktop favorites
const platformFavorite = (initialArray, updatedArray) => {
  let userAgent = window.navigator.userAgent;
  // make sure to display favored games specific to the platform used
  if (isMobile(userAgent)) {
    updatedArray = initialArray.filter(favItem => {
      if (favItem.gameModel) {
        if (favItem.gameModel.platform.includes("iPad") || favItem.gameModel.platform.includes("iPhone") || favItem.gameModel.platform.includes("Android")) {
          return favItem;
        }
      }
    });
  } else {
    updatedArray = initialArray.filter(favItem => {
      if (favItem.gameModel) {
        if (favItem.gameModel.platform.includes("PC")) {
          return favItem;
        }
      }
    });
  }
  return updatedArray;
}


exports.xhrFetch = xhrFetch;
exports.isMobile = isMobile
exports.getDevice = getDevice;
exports.checkConfig = checkConfig;
exports.getCustomOperatorData = getCustomOperatorData;
exports.platformFavorite = platformFavorite;
exports._ = _;
exports.setupI18n = setupI18n;
