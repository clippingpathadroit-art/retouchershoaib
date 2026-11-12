(function(){
  var path = (window.location.pathname || '/').replace(/\.html$/, '') || '/';
  if (path !== '/' && path.endsWith('/')) path = path.slice(0, -1);

  // Desktop Services Dropdown ARIA + Click/Escape Support
  document.querySelectorAll('[data-nav-drop]').forEach(function(drop){
    var btn = drop.querySelector('.nav-drop-btn');
    var menu = drop.querySelector('.nav-dd-menu');
    if (!btn || !menu) return;

    function setOpen(v){
      drop.classList.toggle('open', v);
      btn.setAttribute('aria-expanded', v ? 'true' : 'false');
    }

    drop.addEventListener('mouseenter', function(){ setOpen(true); });
    drop.addEventListener('mouseleave', function(){ setOpen(false); });
    drop.addEventListener('focusin', function(){ setOpen(true); });
    drop.addEventListener('focusout', function(e){
      if (!drop.contains(e.relatedTarget)) setOpen(false);
    });
    drop.addEventListener('keydown', function(e){
      if (e.key === 'Escape') {
        setOpen(false);
        btn.focus();
      }
    });

    // Mark active dropdown item + parent Services link when on service subpages
    var matchedSub = false;
    menu.querySelectorAll('a').forEach(function(a){
      var href = (a.getAttribute('href') || '').split('#')[0];
      if (href && href !== '/services' && path === href) {
        a.classList.add('cur-sub');
        a.setAttribute('aria-current', 'page');
        matchedSub = true;
      } else if (path === '/services' && a.getAttribute('href') === '/services') {
        a.classList.add('cur-sub');
      }
    });
    if (matchedSub || path === '/services') {
      btn.classList.add('cur');
    }
  });

  // Mobile Slide Drawer (Mounted on <body> so backdrop-filter <header> never clips it)
  var mobBtn = document.getElementById('navMobBtn');
  if (!mobBtn) return;

  var drawer = document.getElementById('mobDrawer');
  if (!drawer) {
    drawer = document.createElement('div');
    drawer.id = 'mobDrawer';
    drawer.className = 'mob-drawer';
    drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML =
      '<div class="mob-panel" role="dialog" aria-modal="true" aria-label="Site navigation">' +
        '<div class="mob-top">' +
          '<span class="mob-title">Retoucher Shoaib<sup>&reg;</sup></span>' +
          '<button class="mob-close" id="mobClose" type="button" aria-label="Close navigation menu">&times;</button>' +
        '</div>' +
        '<div class="mob-list">' +
          '<a class="mob-link" href="/">Home</a>' +
          '<details class="mob-acc" open>' +
            '<summary>Services <span aria-hidden="true">&#9662;</span></summary>' +
            '<div class="mob-sub">' +
              '<a href="/services"><span>All Services Overview</span></a>' +
              '<a href="/ecommerce-product-retouching"><span>E-Commerce Product Retouching</span><em class="nav-new">Live</em></a>' +
              '<a href="/ghost-mannequin-fashion-photo-retouching"><span>Fashion &amp; Ghost Mannequin</span><em class="nav-new">Live</em></a>' +
              '<a href="/jewelry-watch-photo-retouching"><span>Jewelry &amp; Watch Retouching</span><em class="nav-new">Live</em></a>' +
              '<a href="/services#beauty"><span>Model &amp; Beauty Portraits</span></a>' +
              '<a href="/services#still"><span>Still Life &amp; Cosmetics</span></a>' +
              '<a href="/services#automotive"><span>Automotive Retouching</span></a>' +
            '</div>' +
          '</details>' +
          '<a class="mob-link" href="/studio">Studio</a>' +
          '<a class="mob-link" href="/work">Work</a>' +
          '<a class="mob-link" href="/feed">Feed</a>' +
          '<a class="mob-link" href="/contact">Contact</a>' +
        '</div>' +
        '<div class="mob-ctas">' +
          '<a class="mob-cta-p" href="/contact?service=ecom">Start Free 24h Test Edit &rarr;</a>' +
          '<a class="mob-cta-s" href="/portal" rel="nofollow">Client Portal</a>' +
        '</div>' +
      '</div>';
    document.body.appendChild(drawer);
  }

  // Highlight active route in mobile drawer
  drawer.querySelectorAll('a[href]').forEach(function(a){
    var href = (a.getAttribute('href') || '').split('#')[0].split('?')[0];
    if ((href === '/' && path === '/') || (href && href !== '/' && path === href)) {
      a.classList.add('cur');
    }
  });

  var closeBtn = drawer.querySelector('#mobClose');
  var prevOverflow = '';

  function openDrawer(){
    prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    mobBtn.setAttribute('aria-expanded', 'true');
    if (closeBtn) closeBtn.focus();
  }

  function closeDrawer(){
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    mobBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = prevOverflow;
    mobBtn.focus();
  }

  mobBtn.addEventListener('click', function(){
    if (drawer.classList.contains('open')) closeDrawer();
    else openDrawer();
  });

  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  drawer.addEventListener('click', function(e){
    if (e.target === drawer) closeDrawer();
    else if (e.target.closest('a[href]')) {
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
      mobBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = prevOverflow;
    }
  });
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer();
  });
})();
