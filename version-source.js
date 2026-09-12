(() => {
  'use strict';

  const versionButton = document.getElementById('versionBtn');
  const match = versionButton && versionButton.textContent.match(/(\d+\.\d+\.\d+)/);
  if (match) document.documentElement.dataset.appVersion = match[1];
})();
