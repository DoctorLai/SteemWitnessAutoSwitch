module.exports.sleep = function (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

module.exports.log = function (messages) {
  // Get the current timestamp
  const timestamp = new Date().toISOString();
  // Format the messages with the timestamp
  console.log(`[${timestamp}]`, ...messages);
}

module.exports.runInterval = function (func, wait, times) {
  let interv = function (w, t) {
    return function () {
      if (typeof t === "undefined" || t-- > 0) {
        setTimeout(interv, w);
        try {
          func.call(null);
        }
        catch (e) {
          t = 0;
          throw e.toString();
        }
      }
    };
  }(wait, times);
  setTimeout(interv, wait);
};

// check if y array includes any x 
module.exports.arrayInArray = function (x, y) {
  if (!x) { return false; }
  if (!y) { return false; }
  if (!x.constructor === Array) return false;
  if (!y.constructor === Array) return false;
  if (typeof x !== "object") { return false; }
  if (!Array.isArray(x)) { return false; }
  return x.some(r => y.includes(r));
}

module.exports.shuffle = function (a) {
  let j, x, i;
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
  return a;
}
