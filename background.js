chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('main.html', {
    'bounds': {
      'width': 450,
      'height': 230,
      'left': 100,
      'top': 100
    },
    minWidth: 450,
    minHeight: 230
  });
});
