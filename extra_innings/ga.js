/* Google Analytics (same property as the portal). Every page of the game loads this
   first; each act is its own page, so each one shows up as its own page view. */
(function () {
  var id = 'G-6T18F5R1SE';
  try {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', id, { content_group: 'extra_innings' });
  } catch (e) { /* analytics must never break the game */ }
})();
