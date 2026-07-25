// RetroAPI wiki, static site helpers: theme, code/data mode, sidebar nav, copy buttons, pager.
// Everything is build-free: each page includes this script and gets the chrome.

(function () {
    'use strict';

    // ------------------------------------------------------------- structure --
    // Single source of truth for navigation. Sections group pages; a page is
    // [file, title, blurb]. The pager walks the flattened order.
    var SECTIONS = [
        ['Start here', [
            ['index.html', 'What RetroAPI is', 'Why b1.7.3, what the loaders do, and what this library adds'],
            ['setup.html', 'Set up a project', 'Gradle, mappings, fabric.mod.json, first run'],
            ['entrypoints.html', 'Entrypoints & sides', 'The retroapi entrypoint, client/server halves, what runs where'],
            ['assets.html', 'Textures, names & files', 'Sprites, lang files, resource layout, the atlas']
        ]],
        ['The registry', [
            ['registry.html', 'How registration works', 'Ids, the two ways to declare content, and what RetroAPI does with them'],
            ['blocks.html', 'Blocks', 'Cubes, per-face textures, tinting, overlays, tool gating'],
            ['states.html', 'Block states', 'Properties, flattened indices, and storage past the nibble'],
            ['items.html', 'Items', 'Stacks, custom classes, layered sprites'],
            ['tools.html', 'Tools, food & armor', 'Tools without a material, tiers, edible items, armor sets'],
            ['tags.html', 'Tags', 'mineable, needs_tier, and your own ore-dictionary style tags'],
            ['recipes.html', 'Recipes & fuel', 'Shaped, shapeless, smelting, fuel, and the wildcard rule'],
            ['blockentities.html', 'Block entities & GUIs', 'Tickers, inventories, containers, screens'],
            ['entities.html', 'Entities', 'Mobs, renderers, spawn networking'],
            ['complex-entity.html', 'A mob in full', 'Riding, gliding, breeding, fear, and the packets behind them'],
            ['achievements.html', 'Achievements', 'Toasts, pages, and granting from gameplay'],
            ['sounds.html', 'Sounds & music', 'Effects, streaming music, records, the server bridge'],
            ['particles.html', 'Particles', 'A particle registry, sprite particles, multiplayer'],
            ['components.html', 'Item components', 'Typed per-stack data, tooltips, dynamic textures'],
            ['dimensions.html', 'Dimensions & portals', 'Registering a world and walking into it'],
            ['worldgen.html', 'Worldgen', 'Chunk generators, biomes, and features that generate in existing worlds']
        ]],
        ['Making it look right', [
            ['models.html', 'Models & render layers', 'JSON models, blockstates, animation, transparency'],
            ['facing.html', 'Directional blocks', 'Four-way, six-way, and per-face textures'],
            ['voxelshapes.html', 'Voxel shapes', 'Multi-box outlines, collision and raytracing']
        ]],
        ['Systems & internals', [
            ['multiblocks.html', 'Positions & multiblocks', 'RetroVec3i, RetroDirection, patterns, the load pass'],
            ['networking.html', 'Networking', 'Custom packets with OSL networking'],
            ['storage.html', 'World safety', 'The sidecar, id maps, and why modded worlds survive'],
            ['stationapi.html', 'StationAPI interop', 'What changes, what does not, and how to ship for both'],
            ['mixins.html', 'Mixins', 'The twelve-example course, plus safety'],
            ['testing.html', 'Testing', 'Running client & server, offline mode, sided gotchas']
        ]]
    ];

    var PAGES = [];
    for (var s = 0; s < SECTIONS.length; s++) {
        for (var q = 0; q < SECTIONS[s][1].length; q++) {
            PAGES.push(SECTIONS[s][1][q]);
        }
    }

    // ---------------------------------------------------------------- theme --
    var saved = null;
    try { saved = localStorage.getItem('retroapi-theme'); } catch (e) {}
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);

    function toggleTheme() {
        theme = (theme === 'dark') ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        try { localStorage.setItem('retroapi-theme', theme); } catch (e) {}
        updateToggleLabel();
    }

    function updateToggleLabel() {
        var btn = document.querySelector('.theme-toggle');
        if (btn) btn.textContent = (theme === 'dark') ? '☀ light' : '☾ dark';
    }

    // ----------------------------------------------------------- code / data --
    // Most content can be declared twice over: in code (a builder call) or in data (a JSON
    // file the game loads). Pages write both into a .dual block; this switch picks which one
    // is shown, everywhere at once, and remembers the choice. Code is the default: it is the
    // shorter answer for most mods, it cannot typo a filename, and it needs no resource pack.
    var savedMode = null;
    try { savedMode = localStorage.getItem('retroapi-mode'); } catch (e) {}
    var mode = (savedMode === 'data') ? 'data' : 'code';
    document.documentElement.setAttribute('data-mode', mode);

    function setMode(next) {
        mode = (next === 'data') ? 'data' : 'code';
        document.documentElement.setAttribute('data-mode', mode);
        try { localStorage.setItem('retroapi-mode', mode); } catch (e) {}
        var buttons = document.querySelectorAll('.mode-btn');
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].classList.toggle('active', buttons[i].getAttribute('data-set') === mode);
        }
    }

    function modeSwitch(topic) {
        var what = topic ? ' ' + topic : '';
        return '<span class="mode-switch">'
            + '<button type="button" class="mode-btn' + (mode === 'code' ? ' active' : '') + '" data-set="code">'
            + 'code driven' + what + '</button>'
            + '<button type="button" class="mode-btn' + (mode === 'data' ? ' active' : '') + '" data-set="data">'
            + 'data driven' + what + '</button>'
            + '</span>';
    }

    function wireModeButtons(root) {
        var buttons = (root || document).querySelectorAll('.mode-btn');
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].addEventListener('click', function () {
                setMode(this.getAttribute('data-set'));
            });
        }
    }

    // Give every .dual block its own switch, so the choice is offered where the reader is
    // looking, not only in the header. Panes are <div data-mode="code"> / <div data-mode="data">.
    function buildDualBlocks() {
        var duals = document.querySelectorAll('.dual');
        for (var i = 0; i < duals.length; i++) {
            var d = duals[i];
            if (d.getAttribute('data-built') === 'yes') continue;
            d.setAttribute('data-built', 'yes');
            var head = document.createElement('div');
            head.className = 'dual-head';
            head.innerHTML = modeSwitch(d.getAttribute('data-topic') || '');
            d.insertBefore(head, d.firstChild);
        }
    }

    // ------------------------------------------------------------ build UI --
    function currentFile() {
        var f = location.pathname.split('/').pop();
        return f === '' ? 'index.html' : f;
    }

    function slugify(text) {
        return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }

    // The expandable subsection list for the CURRENT page: every <h2> in the content,
    // each given an id so links (and cross-page deep links) land on it.
    function buildSubsections() {
        var heads = document.querySelectorAll('.content h2');
        if (!heads.length) return '';
        var html = '<ul class="subsections">';
        for (var j = 0; j < heads.length; j++) {
            var h = heads[j];
            if (!h.id) { h.id = slugify(h.textContent); }
            html += '<li><a href="#' + h.id + '">' + h.textContent + '</a></li>';
        }
        return html + '</ul>';
    }

    function buildSidebar() {
        var aside = document.querySelector('.sidebar');
        if (!aside) return;
        var here = currentFile();
        var html = '<a class="home-link" href="index.html">RetroAPI wiki</a>';
        for (var i = 0; i < SECTIONS.length; i++) {
            html += '<h3>' + SECTIONS[i][0] + '</h3><ul class="chapter-list">';
            var pages = SECTIONS[i][1];
            for (var j = 0; j < pages.length; j++) {
                var c = pages[j];
                var active = c[0] === here;
                html += '<li><a href="' + c[0] + '"' + (active ? ' class="active"' : '') + '>'
                    + '<span class="chapter-name">' + c[1] + '</span>'
                    + '<span class="chapter-blurb">' + c[2] + '</span></a>';
                if (active) { html += buildSubsections(); }
                html += '</li>';
            }
            html += '</ul>';
        }
        html += '<h3>Downloads</h3><ul>'
            + '<li><a href="bare-retroapi-template.zip" download>⬇ bare template</a></li>'
            + '<li><a href="feature-showcase-retroapi-template.zip" download>⬇ feature showcase</a></li>'
            + '</ul><h3>Elsewhere</h3><ul>'
            + '<li><a href="../index.html">← matthewperiut.github.io</a></li>'
            + '<li><a href="https://github.com/matthewperiut/RetroAPI">RetroAPI source</a></li>'
            + '<li><a href="https://ornithemc.net/develop">Ornithe dev portal</a></li>'
            + '<li><a href="https://github.com/LlamaLad7/MixinExtras/wiki">MixinExtras wiki</a></li>'
            + '</ul>';
        aside.innerHTML = html;
    }

    function buildHeader() {
        var header = document.querySelector('.page-header');
        if (!header) return;
        var here = currentFile();
        var crumb = '';
        var section = '';
        for (var i = 0; i < SECTIONS.length && !crumb; i++) {
            var pages = SECTIONS[i][1];
            for (var j = 0; j < pages.length; j++) {
                if (pages[j][0] === here) { crumb = pages[j][1]; section = SECTIONS[i][0]; break; }
            }
        }
        header.innerHTML = '<p class="crumbs"><a href="index.html">RetroAPI wiki</a>'
            + (section ? ' / ' + section : '') + (crumb ? ' / ' + crumb : '') + '</p>'
            + '<span class="header-tools">'
            + '<button class="theme-toggle" type="button"></button></span>';
        header.querySelector('.theme-toggle').addEventListener('click', toggleTheme);
        updateToggleLabel();
    }

    function buildPager() {
        var pager = document.querySelector('.pager');
        if (!pager) return;
        var here = currentFile();
        var idx = -1;
        for (var i = 0; i < PAGES.length; i++) {
            if (PAGES[i][0] === here) { idx = i; break; }
        }
        if (idx === -1) return;
        var html = '';
        if (idx > 0) {
            var p = PAGES[idx - 1];
            html += '<a class="prev" href="' + p[0] + '"><span class="pager-label">previous</span>← ' + p[1] + '</a>';
        }
        if (idx < PAGES.length - 1) {
            var n = PAGES[idx + 1];
            html += '<a class="next" href="' + n[0] + '"><span class="pager-label">next</span>' + n[1] + ' →</a>';
        }
        pager.innerHTML = html;
    }

    // every <pre> gets a copy button (wrapped in .codeblock by the page author,
    // or wrapped here automatically if it isn't)
    function buildCopyButtons() {
        var pres = document.querySelectorAll('pre');
        for (var i = 0; i < pres.length; i++) {
            (function (pre) {
                var wrap = pre.parentElement;
                if (!wrap.classList.contains('codeblock')) {
                    var w = document.createElement('div');
                    w.className = 'codeblock';
                    pre.parentNode.insertBefore(w, pre);
                    w.appendChild(pre);
                    wrap = w;
                }
                var btn = document.createElement('button');
                btn.className = 'copy-btn';
                btn.type = 'button';
                btn.textContent = 'copy';
                btn.addEventListener('click', function () {
                    var text = pre.innerText.replace(/\n$/, '');
                    function done() {
                        btn.textContent = 'copied!';
                        setTimeout(function () { btn.textContent = 'copy'; }, 1400);
                    }
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(text).then(done);
                    } else {
                        var ta = document.createElement('textarea');
                        ta.value = text;
                        document.body.appendChild(ta);
                        ta.select();
                        try { document.execCommand('copy'); } catch (e) {}
                        document.body.removeChild(ta);
                        done();
                    }
                });
                wrap.appendChild(btn);
            })(pres[i]);
        }
    }

    // Any codeblock that quotes a real asset file (a model/blockstate json, an ogg, a
    // .mcmeta, the lang file) gets a download link in its title bar, pointing at the
    // mirrored copy under assets/example_mod/.
    function buildAssetDownloads() {
        var titles = document.querySelectorAll('.code-title');
        for (var i = 0; i < titles.length; i++) {
            var path = titles[i].textContent.split(',')[0].trim();
            var m = path.match(/((?:assets|data)\/example_mod\/.+\.(?:json|ogg|mcmeta|lang))$/);
            if (!m) { continue; }
            var a = document.createElement('a');
            a.href = m[1];
            a.setAttribute('download', '');
            a.className = 'code-download';
            a.textContent = '↓ download';
            titles[i].appendChild(a);
        }
    }

    // Most pages call id("name"), the mod's own one-line helper. Rather than repeat its
    // definition on every page, inject it once near the top of any page that uses it.
    function buildIdHelper() {
        var content = document.querySelector('.content');
        if (!content) { return; }
        var codes = content.querySelectorAll('pre code');
        var usesId = false;
        for (var i = 0; i < codes.length; i++) {
            if (/\bid\(\s*["']/.test(codes[i].textContent)) { usesId = true; break; }
        }
        if (!usesId) { return; }
        var anchor = content.querySelector('.chapter-sub') || content.querySelector('h1');
        if (!anchor) { return; }
        var note = document.createElement('div');
        note.className = 'id-helper';
        note.innerHTML = '<p><strong>A note on <code>id(...)</code>:</strong> every page uses '
            + '<code>id("name")</code>, this mod\'s own one-line helper that turns a bare name into a '
            + 'namespaced id. It is not part of RetroAPI; you define it once in your mod class (here '
            + '<code>MOD_ID</code> is <code>"example_mod"</code>):</p>'
            + '<div class="codeblock"><span class="code-title">in your mod class</span><pre><code>'
            + '<span class="k">public static</span> NamespacedIdentifier id(<span class="k">String</span> name) {\n'
            + '    <span class="k">return</span> NamespacedIdentifiers.from(MOD_ID, name);\n'
            + '}</code></pre></div>';
        anchor.parentNode.insertBefore(note, anchor.nextSibling);
    }

    function init() {
        buildSidebar();
        buildHeader();
        buildPager();
        buildIdHelper();
        buildDualBlocks();
        buildCopyButtons();
        buildAssetDownloads();
        wireModeButtons(document);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
