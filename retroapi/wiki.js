// RetroAPI guide, static site helpers: theme, sidebar nav, copy buttons, pager.
// Everything is build-free: each page includes this script and gets the chrome.

(function () {
    'use strict';

    // ------------------------------------------------------------- chapters --
    // Single source of truth for navigation. file -> [number, title, blurb]
    var CHAPTERS = [
        ['index.html',        '·',  'Welcome',          'What RetroAPI is, and the two template downloads'],
        ['setup.html',        '1',  'The Workshop',     'Environment setup: gradle, biny mappings, fabric.mod.json'],
        ['entrypoints.html',  '2',  'Three Doors In',   'init, client-init, server-init, and what runs where'],
        ['assets.html',       '3',  'Pixels & Words',   'Textures, sprite ids, GUI art, lang files, sounds'],
        ['blocks.html',       '4',  'Blocks',           'From one cube to render types and multi-sided faces'],
        ['items.html',        '5',  'Items',            'Simple items and the Jump Stick (custom classes)'],
        ['blockentities.html','6',  'Machines',         'Block entities: counter, crate GUI, the freezer'],
        ['entities.html',     '7',  'Creatures',        'Custom mobs, renderers, and entity networking'],
        ['complex-entity.html','8', 'The Aerbunny',     'A complex mob in full: riding, gliding, breeding, fear, and the networking behind them'],
        ['achievements.html', '9',  'Achievements',     'Toasts, pages, and granting from gameplay'],
        ['dimensions.html',   '10', 'Other Worlds',     'Dimensions and walk-in portals'],
        ['recipes.html',      '11', 'Recipes',          'Shaped, shapeless, smelting, and fuel'],
        ['networking.html',   '12', 'Wires',            'Custom packets with OSL networking'],
        ['mixins.html',       '13', 'The Scalpel',      'Mixins: the 12-example course + safety'],
        ['states.html',       '14', 'Deeper States',    'Flattened blockstates and secondary meta'],
        ['voxelshapes.html',  '15', 'True Shapes',      'VoxelShapes: multi-box outlines, collision, raytrace'],
        ['models.html',       '16', 'Shapes & Pixels',  'JSON models, render layers, animated textures'],
        ['facing.html',       '17', 'Facing the World', 'Directional blocks: a log that flips, a freezer that faces you'],
        ['tools.html',        '18', 'The Toolbelt',     'Custom tools, edible food, and a full armor set'],
        ['sounds.html',       '19', 'The Soundtrack',   'Sound effects, streaming music, and jukebox records'],
        ['worldgen.html',     '20', 'New Lands',        'Dimensions, chunk generators, biomes, and spawn rules'],
        ['components.html',   '21', 'Item Memory',      'Data components: typed item data, tooltips, dynamic textures'],
        ['testing.html',      '22', 'Proving Grounds',  'Running client & server, offline mode, sided gotchas']
    ];

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
        if (btn) btn.textContent = (theme === 'dark') ? '☀ light mode' : '☾ dark mode';
    }

    // ------------------------------------------------------------ build UI --
    function currentFile() {
        var f = location.pathname.split('/').pop();
        return f === '' ? 'index.html' : f;
    }

    // Turn a heading's text into a stable anchor id ("The simplest item" -> "the-simplest-item").
    function slugify(text) {
        return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }

    // The expandable subsection list for the CURRENT page: every <h2> in the content,
    // each given an id (so the link, and cross-page deep links, land on it) and listed
    // under the active chapter. Built by scanning the DOM, so pages need no extra data.
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
        var html = '<a class="home-link" href="index.html">RetroAPI Guide</a>';
        html += '<h3>Chapters</h3><ul class="chapter-list">';
        for (var i = 0; i < CHAPTERS.length; i++) {
            var c = CHAPTERS[i];
            var active = c[0] === here;
            // Each chapter shows its fun name AND a plain-language blurb of what it covers,
            // so the nav says what the chapter is actually about, not just its title.
            html += '<li><a href="' + c[0] + '"' + (active ? ' class="active"' : '') + '>'
                + '<span class="chapter-num">' + c[1] + '</span>'
                + '<span class="chapter-name">' + c[2] + '</span>'
                + '<span class="chapter-blurb">' + c[3] + '</span></a>';
            if (active) { html += buildSubsections(); }
            html += '</li>';
        }
        html += '</ul><h3>Downloads</h3><ul>'
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
        for (var i = 0; i < CHAPTERS.length; i++) {
            if (CHAPTERS[i][0] === here) {
                crumb = (CHAPTERS[i][1] === '·' ? '' : 'Chapter ' + CHAPTERS[i][1] + ', ') + CHAPTERS[i][2];
                break;
            }
        }
        header.innerHTML = '<p class="crumbs"><a href="index.html">RetroAPI Guide</a>'
            + (crumb ? ' / ' + crumb : '') + '</p>'
            + '<button class="theme-toggle" type="button"></button>';
        header.querySelector('.theme-toggle').addEventListener('click', toggleTheme);
        updateToggleLabel();
    }

    function buildPager() {
        var pager = document.querySelector('.pager');
        if (!pager) return;
        var here = currentFile();
        var idx = -1;
        for (var i = 0; i < CHAPTERS.length; i++) {
            if (CHAPTERS[i][0] === here) { idx = i; break; }
        }
        if (idx === -1) return;
        var html = '';
        if (idx > 0) {
            var p = CHAPTERS[idx - 1];
            html += '<a class="prev" href="' + p[0] + '"><span class="pager-label">previous</span>← ' + p[2] + '</a>';
        }
        if (idx < CHAPTERS.length - 1) {
            var n = CHAPTERS[idx + 1];
            html += '<a class="next" href="' + n[0] + '"><span class="pager-label">next</span>' + n[2] + ' →</a>';
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
    // mirrored copy under assets/example_mod/. So every asset the guide shows is grabbable
    // from the chapter that introduces it, no separate downloads page to keep in sync.
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

    // Most chapters call id("name"), the mod's own one-line helper that turns a bare name
    // into a namespaced id. Rather than repeat its definition on every page (or leave a
    // reader wondering where it comes from), inject it once near the top of any page that
    // actually uses it. Runs before buildCopyButtons so the injected snippet gets a copy
    // button like any other.
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
        note.innerHTML = '<p><strong>A note on <code>id(...)</code>:</strong> every chapter uses '
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
        buildCopyButtons();
        buildAssetDownloads();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
