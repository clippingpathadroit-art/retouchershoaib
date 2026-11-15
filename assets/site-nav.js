(function(){
  var path = (window.location.pathname || '/').replace(/\.html$/, '') || '/';
  if (path !== '/' && path.endsWith('/')) path = path.slice(0, -1);

  var isDe = (document.documentElement.lang || '').toLowerCase() === 'de' ||
             (window.location.pathname || '').indexOf('/de') !== -1;

  // Desktop Services Dropdown ARIA + Click/Escape Support
  document.querySelectorAll('[data-nav-drop]').forEach(function(drop){
    var btn = drop.querySelector('.nav-drop-btn');
    var menu = drop.querySelector('.nav-dd-menu');
    if (!btn || !menu) return;

    function setOpen(v){
      drop.classList.toggle('open', v);
      btn.setAttribute('aria-expanded', v ? 'true' : 'false');
    }

    btn.addEventListener('click', function(e){
      e.preventDefault();
      setOpen(!drop.classList.contains('open'));
    });

    document.addEventListener('click', function(e){
      if (!drop.contains(e.target)) {
        setOpen(false);
      }
    });

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

    // Mark active dropdown item + parent Services / Leistungen link when on service subpages
    var matchedSub = false;
    menu.querySelectorAll('a').forEach(function(a){
      var href = (a.getAttribute('href') || '').split('#')[0];
      if (href && href !== '/' && href !== '/services' && href !== '/de' && href !== '/de/' && (path === href || path === href.replace(/\/$/, ''))) {
        a.classList.add('cur-sub');
        a.setAttribute('aria-current', 'page');
        matchedSub = true;
      } else if ((path === '/services' && href === '/services') || ((path === '/de' || path === '/de/') && (href === '/de' || href === '/de/'))) {
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

    if (isDe) {
      drawer.innerHTML =
        '<div class="mob-panel notranslate" role="dialog" aria-modal="true" aria-label="Webseitennavigation">' +
          '<div class="mob-top">' +
            '<span class="mob-title">Retoucher Shoaib<sup>&reg;</sup></span>' +
            '<button class="mob-close" id="mobClose" type="button" aria-label="Menü schließen">&times;</button>' +
          '</div>' +
          '<div class="mob-list">' +
            '<a class="mob-link" href="/de/">Startseite</a>' +
            '<details class="mob-acc" open>' +
              '<summary>Leistungen (DACH) <span aria-hidden="true">&#9662;</span></summary>' +
              '<div class="mob-sub">' +
                '<a href="/de/"><span>Alle Leistungen (Übersicht)</span></a>' +
                '<a href="/de/produktfotos-bearbeiten-lassen"><span>Produktfotos &amp; Freisteller</span><em class="nav-new">Neu</em></a>' +
                '<a href="/de/schmuckretusche"><span>Schmuck &amp; Uhren</span><em class="nav-new">Neu</em></a>' +
                '<a href="/de/geisterpuppe-mode-retusche"><span>Geisterpuppe &amp; Mode</span><em class="nav-new">Neu</em></a>' +
                '<a href="/de/beauty-retusche"><span>Beauty &amp; Porträts</span><em class="nav-new">Neu</em></a>' +
              '</div>' +
            '</details>' +
            '<a class="mob-link" href="/de/#preise">Preise (€)</a>' +
            '<a class="mob-link" href="/de/#faq">Fragen &amp; Antworten</a>' +
            '<a class="mob-link" href="/contact?ref=de">Kontakt</a>' +
            '<a class="mob-link" href="/" title="Englische Version der Website">English Website (EN)</a>' +
          '</div>' +
          '<div class="mob-ctas">' +
            '<a class="mob-cta-p" href="/contact?ref=de">Kostenlose Testbearbeitung anfordern &rarr;</a>' +
            '<a class="mob-cta-s" href="/portal" rel="nofollow">Anmelden</a>' +
          '</div>' +
        '</div>';
    } else {
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
                '<a href="/model-portrait-photo-retouching"><span>Model &amp; Beauty Portraits</span><em class="nav-new">Live</em></a>' +
                '<a href="/services#still"><span>Still Life &amp; Cosmetics</span></a>' +
                '<a href="/automotive-photo-retouching"><span>Automotive Photo Retouching</span><em class="nav-new">Live</em></a>' +
              '</div>' +
            '</details>' +
            '<a class="mob-link" href="/studio">Studio</a>' +
            '<a class="mob-link" href="/work">Work</a>' +
            '<a class="mob-link" href="/feed">Feed</a>' +
            '<a class="mob-link" href="/contact">Contact</a>' +
            '<a class="mob-link" href="/de/" title="Deutsche Version der Website (DACH)">Deutsch (DACH) &rarr;</a>' +
          '</div>' +
          '<div class="mob-ctas">' +
            '<a class="mob-cta-p" href="/contact?service=ecom">Start Free 24h Test Edit &rarr;</a>' +
            '<a class="mob-cta-s" href="/portal" rel="nofollow">Client Portal</a>' +
          '</div>' +
        '</div>';
    }
    document.body.appendChild(drawer);
  }

  // Highlight active route in mobile drawer
  drawer.querySelectorAll('a[href]').forEach(function(a){
    var href = (a.getAttribute('href') || '').split('#')[0].split('?')[0];
    if (href !== '/' && href.endsWith('/')) href = href.slice(0, -1);
    if ((href === '/' && path === '/') || (href === '/de' && (path === '/de' || path === '/de/')) || (href && href !== '/' && href !== '/de' && path === href)) {
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

  // Central Unified Client Portal Auth State Sync (Both Desktop & Mobile Drawer)
  function syncHeaderClientState() {
    var sessionRaw = sessionStorage.getItem('shoaib_client_session') ||
                     localStorage.getItem('shoaib_client_session') ||
                     localStorage.getItem('shoaib_client_profile');
    var authBtn = document.getElementById('navAuthBtn');
    var mobAuthBtn = drawer ? drawer.querySelector('.mob-cta-s') : null;

    var session = null;
    if (sessionRaw) {
      try { session = JSON.parse(sessionRaw); } catch(e) {}
    }

    var isLoggedIn = !!(session && (session.email || session.name));
    var isDirector = isLoggedIn && (session.email || '').toLowerCase().trim() === 'retouchershoaib@gmail.com';

    // Update Desktop Header Auth Button
    if (authBtn) {
      if (isDirector) {
        authBtn.href = '/admin';
        authBtn.innerHTML = '&#x1f6e1;&#xfe0f; Director Console';
        authBtn.setAttribute('title', 'Studio Director Console');
      } else if (isLoggedIn) {
        authBtn.href = '/portal';
        authBtn.innerHTML = isDe ? 'Kundenportal &#x1f512;' : 'Client Portal';
        authBtn.setAttribute('title', isDe ? 'Ihr persönlicher Kundenbereich' : 'Open your client workspace');
      } else {
        authBtn.href = '/portal';
        authBtn.innerHTML = isDe ? 'Anmelden' : 'Log In';
        authBtn.setAttribute('title', isDe ? 'Im Kundenportal anmelden' : 'Log In or Sign Up to Client Portal');
      }
    }

    // Update Mobile Drawer Secondary CTA
    if (mobAuthBtn) {
      if (isDirector) {
        mobAuthBtn.href = '/admin';
        mobAuthBtn.innerHTML = '&#x1f6e1;&#xfe0f; Director Console';
      } else if (isLoggedIn) {
        mobAuthBtn.href = '/portal';
        mobAuthBtn.innerHTML = isDe ? 'Kundenportal &#x1f512;' : 'Client Portal';
      } else {
        mobAuthBtn.href = '/portal';
        mobAuthBtn.innerHTML = isDe ? 'Anmelden' : 'Log In';
      }
    }
  }

  window.syncHeaderClientState = syncHeaderClientState;
  syncHeaderClientState();

  window.addEventListener('storage', function(e){
    if (e.key === 'shoaib_client_session' || e.key === 'shoaib_client_profile' || e.key === 'shoaib_sync_ping') {
      syncHeaderClientState();
    }
  });
  document.addEventListener('visibilitychange', function(){
    if (document.visibilityState === 'visible') syncHeaderClientState();
  });
  window.addEventListener('focus', syncHeaderClientState);
  window.addEventListener('pageshow', syncHeaderClientState);
})();
