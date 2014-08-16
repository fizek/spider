'use strict';

var currentLanguage = 'en';
var languageReset = document.getElementById('lang-reset');

languageReset.onclick = function() {
  setLanguage('en');
  return false;
};

function setLanguage(lang) {
  if (lang === currentLanguage) {
    return;
  }

  var current = translations[currentLanguage];
  var strings = translations[lang];

  if (!strings || strings.length != current.length) {
    console.log('Language ' + lang + ' not found or invalid.');
    return;
  }

  var translatables = document.getElementsByClassName('trans');

  for (var i = 0; i < translatables.length; ++i) {
    var index = current.indexOf(translatables[i].innerText);

    if (index === -1) {
      console.log('Phrase "' + translatables[i].innerText + '" not found.');
      continue;
    }

    translatables[i].innerText = translations[lang][index];
  };

  if (lang !== 'en') {
    languageReset.classList.remove('hide');
  } else {
    languageReset.classList.add('hide');
  }

  currentLanguage = lang;
}

setLanguage(navigator.language.substr(0, 2));

function showUpdateNotice() {
  var notice = document.getElementById('update-alert');
  notice.classList.remove('hide');

  var reload = notice.getElementsByClassName('alert-link')[0];
  reload.onclick = function() {
    location.reload();
    return false;
  };
}

applicationCache.onupdateready = showUpdateNotice;

if(applicationCache.status === applicationCache.UPDATEREADY) {
  showUpdateNotice();
}

setInterval(function() {
  if(navigator.onLine && (applicationCache.status === applicationCache.IDLE || applicationCache.status === applicationCache.UPDATEREADY)) {
    applicationCache.update();
  }
}, 3600000);

var input = ace.edit('input');
input.setTheme('ace/theme/chrome');
input.getSession().setMode('ace/mode/c_cpp');
input.setShowFoldWidgets(false);
input.setShowPrintMargin(false);
input.setHighlightActiveLine(false);
input.getSession().setUseWrapMode(true);
input.getSession().setUseSoftTabs(false);
input.commands.removeCommand('showSettingsMenu');

ace.config.loadModule('ace/ext/language_tools', function() {
  input.setOptions({
    enableBasicAutocompletion: true,
    enableSnippets: false,
    enableLiveAutocompletion: false,
  });
});

var gutter = document.getElementById('gutter');

function updateGutterWidth() {
  var realGutter = input.container.getElementsByClassName('ace_gutter')[0];
  var width = parseInt(window.getComputedStyle(realGutter).width, 10);

  gutter.style.width = (width + 30 + 1) + 'px';
}

input.renderer.$gutterLayer.on('changeGutterWidth', updateGutterWidth);
updateGutterWidth();

var output = document.getElementById('output');

var spcompButton = document.getElementById('compiler-spcomp');
var amxxpcButton = document.getElementById('compiler-amxxpc');

var compileButton = document.getElementById('compile');
var downloadButton = document.getElementById('download');

var includes = document.getElementById('includes');
var includeDrop = document.getElementById('include-drop');

var spcompTemplate = [
  '#pragma semicolon 1',
  '',
  '#include <sourcemod>',
  '',
  'public Plugin:myinfo = {',
  '\tname        = "",',
  '\tauthor      = "",',
  '\tdescription = "",',
  '\tversion     = "0.0.0",',
  '\turl         = ""',
  '};',
  '',
  'public OnPluginStart()',
  '{',
  '\tPrintToServer("Hello, World!");',
  '}',
  '',
].join('\n');

var amxxpcTemplate = [
  '#pragma semicolon 1',
  '',
  '#include <amxmodx>',
  '',
  'new PLUGIN[]  = "";',
  'new AUTHOR[]  = "";',
  'new VERSION[] = "0.00";',
  '',
  'public plugin_init()',
  '{',
  '\tregister_plugin(PLUGIN, VERSION, AUTHOR);',
  '\t',
  '\tserver_print("Hello, World!");',
  '}',
  '',
].join('\n');

var compiler, template, inputFile, outputFile;
var worker, compiled;

function spcompSetup() {
  if (compiler === 'spcomp') {
    return;
  }

  if (template && input.getValue() === template) {
    input.setValue(spcompTemplate, -1);
  }

  localStorage['compiler'] = compiler = 'spcomp';
  template = spcompTemplate;
  inputFile = 'plugin.sp';
  outputFile = 'plugin.smx';

  if (worker) {
    worker.terminate();
  }

  worker = new Worker('js/worker.js');
  worker.postMessage(compiler);

  compiled = undefined;
  downloadButton.disabled = true;
  output.textContent = '';

  amxxpcButton.classList.remove('active');
  spcompButton.classList.add('active');
}

function amxxpcSetup() {
  if (compiler === 'amxxpc') {
    return;
  }

  if (template && input.getValue() === template) {
    input.setValue(amxxpcTemplate, -1);
  }

  localStorage['compiler'] = compiler = 'amxxpc';
  template = amxxpcTemplate;
  inputFile = 'plugin.sma';
  outputFile = 'plugin.amxx';

  if (worker) {
    worker.terminate();
  }

  worker = new Worker('js/worker.js');
  worker.postMessage(compiler);

  compiled = undefined;
  downloadButton.disabled = true;
  output.textContent = '';

  spcompButton.classList.remove('active');
  amxxpcButton.classList.add('active');
}

spcompButton.onclick = spcompSetup;
amxxpcButton.onclick = amxxpcSetup;

if (localStorage['compiler'] === 'amxxpc') {
  amxxpcSetup();
} else {
  spcompSetup();
}

var savedText = localStorage['input-file'];
var savedIncludes = [];

for (var i = 0; i < localStorage.length; ++i) {
  var key = localStorage.key(i);
  if (key.match(/^\//)) {
    savedIncludes.push(key);
  }
}

var showRestoreNotice = false;

if (savedText && savedText !== template) {
  input.setValue(savedText, -1);

  showRestoreNotice = true;
} else {
  input.setValue(template, -1);
}

if (savedIncludes.length > 0) {
  for (var i = 0; i < savedIncludes.length; ++i) {
    var filename = savedIncludes[i];

    var li = document.createElement('li');
    li.classList.add('list-group-item');

    var close = document.createElement('button');
    close.type = 'button';
    close.classList.add('close');
    close.textContent = '\u00D7';
    close.onclick = (function(filename, li) {
      return (function() {
        delete localStorage[filename];
        includes.removeChild(li);
      });
    })(filename, li);

    var display = document.createElement('ol');

    filename = filename.split('/');
    filename.shift();

    if (filename[0] === 'extra') {
      filename.shift();
    }

    for (var j = 0; j < filename.length; ++j) {
      var olli = document.createElement('li');
      olli.textContent = filename[j];

      display.appendChild(olli);
    }

    li.appendChild(close);
    li.appendChild(display);

    includes.insertBefore(li, includeDrop);
  }

  showRestoreNotice = true;
}

if (showRestoreNotice) {
  var sessionAlert = document.getElementById('session-alert');

  var closeButton = sessionAlert.getElementsByClassName('close')[0];
  closeButton.onclick = function() {
    sessionAlert.classList.add('hide');
  };

  var loadTemplate = sessionAlert.getElementsByClassName('alert-link')[0];
  loadTemplate.onclick = function() {
    sessionAlert.classList.add('hide');

    input.setValue(template, -1);

    for (var i = localStorage.length - 1; i >= 0; --i) {
      var key = localStorage.key(i);

      if (key.match(/^\//)) {
        delete localStorage[key];
      }
    }

    while (includes.childElementCount > 1) {
      includes.removeChild(includes.firstChild);
    }

    compiled = undefined;
    downloadButton.disabled = true;
    output.textContent = '';

    return false;
  };

  sessionAlert.classList.remove('hide');
}

input.on('input', function() {
  localStorage['input-file'] = input.getValue();
});

function killDropEvent(event) {
  event.dataTransfer.dropEffect = 'none';

  event.stopPropagation();
  event.preventDefault();
}

window.ondragenter = killDropEvent;
window.ondragover = killDropEvent;
window.ondrop = killDropEvent;

includeDrop.ondragenter = function(event) {
  includeDrop.classList.add('hover');
  event.dataTransfer.dropEffect = 'copy';

  event.stopPropagation();
  event.preventDefault();
};

includeDrop.ondragover = function(event) {
  event.dataTransfer.dropEffect = 'copy';

  event.stopPropagation();
  event.preventDefault();
};

includeDrop.ondragleave = function(event) {
  includeDrop.classList.remove('hover');

  event.stopPropagation();
  event.preventDefault();
};

includeDrop.ondrop = function(event) {
  includeDrop.classList.remove('hover');

  for (var i = 0; i < event.dataTransfer.files.length; ++i) {
    var file = event.dataTransfer.files[i];

    if (!file.type.match(/^text\//) && !file.name.match(/\.(sma|sp|inc)$/)) {
      continue;
    }

    var reader = new FileReader();
    reader.onload = (function(filename) {
      return function(event) {
        var exists = (localStorage['/extra/' + filename] !== undefined);
        localStorage['/extra/' + filename] = event.target.result;

        if (exists) {
          return;
        }

        var li = document.createElement('li');
        li.classList.add('list-group-item');

        var close = document.createElement('button');
        close.type = 'button';
        close.classList.add('close');
        close.textContent = '\u00D7';
        close.onclick = function() {
          delete localStorage['/extra/' + filename];
          includes.removeChild(li);
        };

        var display = document.createElement('ol');
        var olli = document.createElement('li');
        olli.textContent = filename;
        display.appendChild(olli);

        li.appendChild(close);
        li.appendChild(display);

        includes.insertBefore(li, includeDrop);
      };
    })(file.name);

    reader.readAsText(file);
  }

  event.stopPropagation();
  event.preventDefault();
};

input.container.ondragenter = function(event) {
  event.dataTransfer.dropEffect = 'copy';

  event.stopPropagation();
  event.preventDefault();
};

input.container.ondragover = function(event) {
  event.dataTransfer.dropEffect = 'copy';

  event.stopPropagation();
  event.preventDefault();
};

input.container.ondrop = function(event) {
  if (event.dataTransfer.files.length != 1) {
    return;
  }

  var file = event.dataTransfer.files[0];

  if (!file.type.match(/^text\//) && !file.name.match(/\.(sma|sp|inc)$/)) {
    return;
  }

  if (file.name.match(/\.sp$/)) {
    spcompSetup();
  } else if (file.name.match(/\.sma$/)) {
    amxxpcSetup();
  }

  var reader = new FileReader();
  reader.onload = function(event) {
    input.setValue(event.target.result, -1);
  }

  reader.readAsText(file);

  event.stopPropagation();
  event.preventDefault();
};

function compile() {
  if (worker.onmessage) {
    worker.terminate();
    worker = new Worker('js/worker.js');
    worker.postMessage(compiler);
  }

  worker.onmessage = handle;

  var sources = [];
  //var buffers = [];

  for (var i = 0; i < localStorage.length; ++i) {
    var filename = localStorage.key(i);

    if (filename !== 'input-file' && !filename.match(/^\//)) {
      continue;
    }

    var content = localStorage[filename];

    if (filename === 'input-file') {
      filename = inputFile;
    };

/*
    var buffer = new ArrayBuffer(content.length * 2);
    var view = new Uint16Array(buffer);
    for (var j = 0; j < content.length; ++j) {
      view[j] = content.charCodeAt(j);
    }
*/

    sources.push({path: filename, content: content/*buffer*/});
    //buffers.push(buffer);
  }

  worker.postMessage(sources/*, buffers*/);
}

function handle(event) {
  if (typeof event.data === 'string') {
    output.textContent += event.data + '\r\n';

    var message = event.data.match(/^plugin\.(?:sma|sp)\((\d+)\) : (?:fatal )?(\w+) \d+: (.+)/);
    if (!message) {
      return;
    }

    var annotations = input.getSession().getAnnotations();

    annotations.push({
      column: 0,
      row: message[1] - 1,
      text: message[3],
      type: message[2],
    });

    input.getSession().setAnnotations(annotations);

    return;
  }

  if (event.data !== false) {
    compiled = event.data;
    downloadButton.disabled = false;
  }

  worker.terminate();
  worker = new Worker('js/worker.js');
  worker.postMessage(compiler);
}

compileButton.onclick = function() {
  compiled = undefined;
  downloadButton.disabled = true;

  output.textContent = '';
  input.getSession().clearAnnotations();
  compile();
};

downloadButton.onclick = function() {
  if (!compiled) {
    downloadButton.disabled = true;
    return;
  }

  var blob = new Blob([compiled], {type: 'application/octet-stream'});

  saveAs(blob, outputFile);
};