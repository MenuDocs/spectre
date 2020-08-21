(function (window) {
  window.Spectre = function () {
    let _s2Languages;
    let _languageMap = {};
    return {
      formatDuration: function (seconds) {
        seconds = seconds | 0;
        if (seconds < 60) {
          return "" + seconds + "s";
        } else if (seconds < 3600) {
          return "" + ((seconds / 60) | 0) + "m" + ((seconds % 60) | 0) + "s";
        } else {
          // if(seconds < 86400) {
          return "" + ((seconds / 3600) | 0) + "h" + (((seconds % 3600) / 60) | 0) + "m" + ((seconds % 60) | 0) + "s";
        }
      },
      loadLanguages: async function () {
        const s2Languages = [];
        const langmap = {};

        const languages = await fetch('/languages.json', {cache: 'no-cache'})
          .then((r) => r.json());

        for (const cat of languages) {
          for (const lang of cat.languages) {
            // TODO: find only needed props
            langmap[lang.id] = lang;

            if (lang.alt_ids) {
              lang.alt_ids.forEach((alt) => {
                langmap[alt] = lang;
              });
            }
          }

          s2Languages.push({
            label: cat.name,
            choices: cat.languages
          });
        }

        _languageMap = langmap;
        _s2Languages = s2Languages;
      },
      languagesForSelect2: function () {
        return _s2Languages;
      },
      languageNamed: function (name) {
        if (typeof name === "undefined") return undefined;
        return _languageMap[name];
      },
      defaultLanguage: function () {
        return this.languageNamed(this.getPreference("defaultLanguage"));
      },
      setDefaultLanguage: function (lang) {
        this.setPreference("defaultLanguage", lang.id);
      },
      clearDefaultLanguage: function () {
        this.clearPreference("defaultLanguage");
      },
      defaultExpiration: function () {
        return this.getPreference("defaultExpiration-md", "2d");
      },
      setDefaultExpiration: function (value) {
        this.setPreference("defaultExpiration-md", value);
      },
      clearDefaultExpiration: function () {
        this.clearPreference("defaultExpiration-md");
      },
      setPreference: function (k, v) {
        localStorage[k] = v;
      },
      getPreference: function (k, dflt) {
        return localStorage[k] || dflt;
      },
      clearPreference: function (k) {
        delete localStorage[k];
      },
      updatePartial: function (name) {
        return fetch(`/partial/${name}`)
          .then((r) => r.text())
          .then((reply) => {
            document.querySelector(`#partial_container_${name}`).innerHTML = reply;
            return reply;
          });
      },
      shouldRefreshPageOnLogin: function () {
        // Right now, only refresh for session (the only other page
        // with a login form)
        return (window.location.pathname.match(/session/) || []).length > 0;
      },
      refreshPage: function () {
        window.location.reload();
      },
      _loginReplyHandler: async function (reply) {
        const loginError = document.querySelector('#login_error');
        const resetLoginError = () => {
          animateCSS(loginError, 'fadeOut').then(() => {
            loginError.style.display = 'none';
            loginError.innerHTML = '';
          });
        };

        switch (reply.status) {
          case "valid":
            resetLoginError();
            if (Spectre.shouldRefreshPageOnLogin()) {
              Spectre.refreshPage();
            } else {
              await Spectre.updatePartial("login_logout");
              Spectre.displayFlash({type: "success", body: "Successfully logged in."});
            }

            break;
          case "moreinfo":
            resetLoginError();
            if (typeof reply.invalid_fields !== "undefined") {
              for (const fieldName of reply.invalid_fields) {
                const field = document.querySelector(`form#loginForm input[name="${fieldName}"]`);
                const parentGroup = findParentWithClass(field, 'control-group');

                parentGroup.style.display = 'block';
                animateCSS(parentGroup, 'fadeIn').then(() => {
                  field.focus();
                });
              }
            }

            if (typeof reply.reason !== "undefined") {
              const moreInfo = document.querySelector('#login_moreinfo');

              moreInfo.innerHTML = reply.reason;
              moreInfo.style.display = 'block';

              animateCSS(moreInfo, 'fadeIn');
            }
            break;
          case "invalid":
            if (typeof reply.invalid_fields !== "undefined") {
              for (const fieldName of reply.invalid_fields) {
                const field = document.querySelector(`form#loginForm input[name="${fieldName}"]`);
                const parentGroup = findParentWithClass(field, 'control-group');

                parentGroup.classList.add('error');
              }
            }

            if (typeof reply.reason !== "undefined") {
              loginError.innerHTML = reply.reason;
              loginError.style.display = 'block';

              animateCSS(loginError, 'fadeIn');
            }
            break;
        }
      },
      login: function (data) {
        const blocker = document.querySelector('#partial_container_login_logout .blocker');

        blocker.classList.toggle('hide');
        animateCSS(blocker, 'fadeIn');

        for (const el of document.querySelectorAll("form#loginForm .control-group")) {
          el.classList.remove("error");
        }

        const formData = new FormData();

        Object.entries(data).forEach(([key, value]) => {
          formData.append(key, String(value));
        });

        fetch('/auth/login', {
          method: 'POST',
          credentials: 'same-origin',
          body: formData
        })
          .then((r) => {
            animateCSS(blocker, 'fadeOut').then(() => {
              blocker.classList.toggle('hide');
            });

            return r.json();
          })
          .then((res) => Spectre._loginReplyHandler(res))
          .catch(() => {
            //
          });
      },
      logout: function () {
        const blocker = document.querySelector('#partial_container_login_logout .blocker');

        blocker.style.display = 'block';
        animateCSS(blocker, 'fadeIn');

        fetch('/auth/logout', {
          method: 'POST',
          credentials: 'same-origin'
        })
          .then(async () => {
            animateCSS(blocker, 'fadeOut').then(() => {
              blocker.style.display = 'none';
            });

            if (Spectre.shouldRefreshPageOnLogin()) {
              Spectre.refreshPage();
            } else {
              await Spectre.updatePartial("login_logout");
              Spectre.displayFlash({type: "success", body: "Successfully logged out."});
            }
          })
          .catch((wat) => {
            alert(wat);
          });
      },
      displayFlash: function (flash) {
        const container = document.querySelector("#flash-container");
        const newFlash = container.querySelector("#flash-template").cloneNode(true);

        newFlash.removeAttribute('id');
        newFlash.querySelector('p').innerHTML = flash.body;

        if (flash.type) {
          newFlash.classList.add('well-' + flash.type);
        }

        container.appendChild(newFlash);
        container.style.display = 'block';

        setTimeout(() => {
          newFlash.style.display = 'block';
          animateCSS(newFlash, 'fadeIn');

          setTimeout(() => {
            animateCSS(newFlash, 'fadeOut').then(() => {
              container.style.display = 'none';
              newFlash.remove();
            });
          }, 4000);
        }, 500);
      },
    };
  }();
})(window);

document.addEventListener('DOMContentLoaded', async () => {
  if (docCookies.hasItem("flash")) {
    const flash = JSON.parse(atob(docCookies.getItem("flash")));
    docCookies.removeItem("flash", "/");
    Spectre.displayFlash(flash);
  }

  const codeEditor = document.querySelector('#code-editor');
  const code = document.querySelector('#code');
  const pasteForm = document.querySelector('#pasteForm');

  if (pasteForm) {
    const context = pasteForm.dataset.context;
    const langbox = document.getElementById('choices-multiple-groups');


    const choices = new Choices(langbox, {
      placeholder: true,
      shouldSort: false,
    });

    const langLoader = async () => {
      await Spectre.loadLanguages();

      return Spectre.languagesForSelect2();
    };

    choices.setChoices(langLoader, 'id', 'name', true).then(() => {
      const lang = Spectre.languageNamed(langbox.dataset.selected) || Spectre.defaultLanguage() || Spectre.languageNamed("text");

      choices.setChoiceByValue(lang.id);
    });

    // https://github.com/jshjohnson/Choices

    if (context === 'new') {
      pasteForm.querySelector('input[name="expire"]').value = Spectre.defaultExpiration();


      const optionsModal = document.querySelector('#optionsModal');
      const optionsButton = document.querySelector('#optionsButton');
      const optionsModalInstance = new BSN.Modal(optionsModal, { keyboard: true, backdrop: false });

      optionsButton.addEventListener('click', () => {
        optionsModalInstance.show();
      });

      Array.from(
        optionsModal.querySelectorAll('input[type="checkbox"]')
      ).forEach((cb) => {
        cb.checked = Spectre.getPreference(cb.dataset.gbKey, 'false') === 'true';

        cb.addEventListener('change', (e) => {
          const el = e.target;

          Spectre.setPreference(el.dataset.gbKey, el.checked ? 'true' : 'false');
        });
      });
    }

    const deleteModal = document.querySelector('#deleteModal')

    if (deleteModal) {
      const deleteModalButton = document.querySelector('#deleteModalButton')
      const modalInstance = new BSN.Modal(deleteModal, { keyboard: true, backdrop: false });

      deleteModalButton.addEventListener('click', (e) => {
        e.preventDefault();

        modalInstance.show();
      });
    }

    pasteForm.addEventListener('submit', (e) => {
      if (!(codeEditor.value.match(/[^\s]/) || []).length) {
        e.preventDefault();
        const emptyModal = document.querySelector('#emptyPasteModal');
        const modalInstance = new BSN.Modal(emptyModal, { keyboard: true, backdrop: false });

        modalInstance.show();

        return;
      }

      if (context === 'new') {
        if (Spectre.getPreference('saveExpiration', 'false') === 'true') {
          Spectre.setDefaultExpiration(pasteForm.querySelector('input[name="expire"]').value);
        } else {
          Spectre.clearDefaultExpiration();
        }

        if (Spectre.getPreference('saveLanguage', 'false') === 'true') {
          Spectre.setDefaultLanguage(langbox.value);
        } else {
          Spectre.clearDefaultLanguage();
        }
      }

      pasteForm.querySelector('input[name="title"]').value = document.querySelector('#editable-paste-title').innerText;
    });

    document.querySelector('#editable-paste-title')
      .addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          codeEditor.focus();
        }
      });
  }

  const controls = document.querySelector('#paste-controls');

  if (controls) {
    // TIL that appendChild can move nodes, that's pretty cool
    onMediaQueryChanged('screen and (max-width: 767px)', (mql) => {
      if (mql.matches) {
        const phone = document.querySelector('#phone-paste-control-container');

        phone.prepend(controls);
      } else {
        const pc = document.querySelector('#desktop-paste-control-container');

        pc.prepend(controls);
      }
    });
  }

  (function () {
    const encryptModal = document.querySelector('#encryptModal');
    const encryptionButton = document.querySelector('#encryptionButton');

    if (!encryptModal || !encryptionButton) {
      return;
    }

    const encryptModalInstance = new BSN.Modal(encryptModal, { keyboard: true, backdrop: false });
    const modalPasswordField = encryptModal.querySelector('input[type="password"]');
    const pastePasswordField = pasteForm.querySelector('input[name="password"]');

    encryptModalInstance.hide();

    encryptModal.addEventListener('show.bs.modal', () => {
      modalPasswordField.value = pastePasswordField.value;
    });

    encryptModal.addEventListener('shown.bs.modal', () => {
      modalPasswordField.focus();
      modalPasswordField.select();
    });

    const setEncrypted = (encrypted) => {
      const encryptionIcon = document.querySelector('#encryptionIcon');

      encryptionIcon.classList.remove('icon-lock', 'icon-lock-open-alt');
      encryptionIcon.classList.add(encrypted ? 'icon-lock' : 'icon-lock-open-alt');

      document.querySelector('#encryptionButton .button-data-label').innerText = encrypted ? 'On' : '';
    };

    encryptModal.addEventListener('hidden.bs.modal', () => {
      pastePasswordField.value = modalPasswordField.value;
      setEncrypted(modalPasswordField.value.length > 0);
    });

    modalPasswordField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        encryptModalInstance.hide();
      }
    });

    encryptionButton.addEventListener('click', () => {
      encryptModalInstance.show();
    });
  })();
  (function () {
    const expireModal = document.querySelector('#expireModal');
    const expirationButton = document.querySelector('#expirationButton');

    if (!expireModal || !expirationButton) {
      return;
    }

    const expireModalInstance = new BSN.Modal(expireModal, { keyboard: true, backdrop: false });

    expireModalInstance.hide();

    const expireInput = pasteForm.querySelector('input[name="expire"]');
    const expireDataLabel = document.querySelector('#expirationButton .button-data-label');
    const setExpirationSelected = (btn) => {
      btn.classList.add('active');
      btn.firstChild.checked = true;
      expireInput.value = btn.dataset.value;
      expireDataLabel.innerHTML = btn.dataset.displayValue;
    };

    const expireButtonGroup = document.querySelector('#expireButtonGroup');

    new BSN.Button(expireButtonGroup);

    expireButtonGroup.addEventListener('change.bs.button', (event) => {
      setExpirationSelected(expireModal.querySelector(`label[data-value].active`));
      expireModalInstance.hide();
    });

    setExpirationSelected(expireModal.querySelector(`label[data-value="${expireInput.value}"]`));

    expirationButton.addEventListener('click', () => {
      expireModalInstance.show();
    });
  })();

  // Common for the following functions.
  const lineNumbers = document.querySelector('#line-numbers');

  // has to be in a function so we can return
  (function () {
    if (!lineNumbers) {
      return;
    }

    if (code) {
      const linebar = document.createElement('div');

      linebar.style.display = 'none';
      linebar.classList.add('line-highlight-bar', 'test');

      const permabar = linebar.cloneNode();

      permabar.classList.add('line-highlight-bar-permanent');

      document.body.append(linebar, permabar);

      function positionLineBar(bar, span) {
        bar.style.left = `${lineNumbers.offsetWidth}px`;
        bar.style.top = `${span.offsetTop + span.parentElement.offsetTop}px`;
        bar.style.width = `${code.offsetWidth}px`;
        bar.style.display = 'block';
      }

      function setSelectedLineNumber(line) {
        if (!line) {
          history.replaceState(null, '', '#');
          delete permabar.dataset.curLine;

          return;
        }

        permabar.dataset.curLine = line;
        history.replaceState({'line': line}, '', `#L${line}`);
      }

      function lineFromHash(hash) {
        if (!hash) {
          return null;
        }

        const v = hash.match(/^#L(\d+)/);

        if (!v) {
          return null;
        }

        return v[1];
      }

      const lineCount = (code.innerText.match(/\n/g) || []).length + 1;

      fillWithLineNumbers(lineNumbers, lineCount).then(() => {
        // TODO: less event listeners please
        for (const span of lineNumbers.children) {
          span.addEventListener('mouseenter', (e) => {
            positionLineBar(linebar, e.target);
          });

          span.addEventListener('mouseleave', () => {
            linebar.style.display = 'none';
          });

          span.addEventListener('click', (e) => {
            const span = e.target;
            const line = span.innerText;

            if (permabar.dataset.curLine === line) {
              setSelectedLineNumber(undefined);
              permabar.style.display = 'none';

              return;
            }

            setSelectedLineNumber(line);
            positionLineBar(permabar, span);
          });
        }

        ['load', 'popstate'].forEach((eName) => {
          window.addEventListener(eName, () => {
            const lineNr = lineFromHash(window.location.hash);

            if (!lineNr) {
              return;
            }

            const span = lineNumbers.querySelector(`span:nth-child(${lineNr})`);

            if (!span) {
              return;
            }

            setSelectedLineNumber(lineNr);
            positionLineBar(permabar, span);

            setTimeout(() => {
              scrollMinimal(span);
            }, 250);
          });
        });
      });

      window.addEventListener('resize', () => {
        linebar.style.width = `${code.offsetWidth}px`;
        permabar.style.width = `${code.offsetWidth}px`;
      });

      // Emitted from spectre.jQuery.js
      document.addEventListener('media-query-changed', (e) => {
        if (!permabar.dataset.curLine) {
          return;
        }

        const span = lineNumbers.querySelector(`span:nth-child(${permabar.dataset.curLine})`);

        if (!span) {
          return;
        }

        positionLineBar(permabar, span);
      });
    } else if (codeEditor) {
      ['input', 'propertychange'].forEach((eName) => {
        codeEditor.addEventListener(eName, () => {
          const lines = (codeEditor.value.match(/\n/g) || []).length + 1;
          fillWithLineNumbers(lineNumbers, lines).then(() => {
            document.querySelector('.textarea-height-wrapper')
              .style.left = `${lineNumbers.offsetWidth}px`;
          })
            .catch(() => { /* Just ignore */
            });
        });
      });

      const inputEvent = new CustomEvent('input');

      codeEditor.dispatchEvent(inputEvent);

      // Emitted from spectre.jQuery.js
      document.addEventListener('media-query-changed', () => {
        codeEditor.dispatchEvent(inputEvent);
      });
    }
  })();
  (function () {
    if (!codeEditor) {
      return;
    }

    codeEditor.addEventListener('keydown', (e) => {
      if (e.ctrlKey && !e.altKey && !e.shiftKey && e.key === 's') {
        e.cancelBubble = true;
        e.preventDefault();

        // submit form
        pasteForm.requestSubmit();
        return;
      }

      if (e.key.toLowerCase() === 'tab' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        e.cancelBubble = true;
        e.preventDefault();
        // TODO: idk
        /*const el = e.target;

        const ends = [el.selectionStart, el.selectionEnd];
        this.value = el.value.substring(0, ends[0]) + "\t" + el.value.substring(ends[1], el.value.length);
        this.selectionStart = el.selectionEnd = ends[0] + 1;*/
      }
    });

    let changed = false;

    listenForEvents(['input', 'propertychange'], codeEditor, () => {
      // If we have a value we mark it as changed
      changed = Boolean(codeEditor.value);
    });

    pasteForm.addEventListener('submit', () => {
      changed = false;
    });

    const delForm = document.querySelector('[name="deleteForm"]');

    if (delForm) {
      delForm.addEventListener('submit', () => {
        changed = false;
      });
    }

    window.onbeforeunload = () => changed ? 'If you leave now, your paste will not be saved.' : undefined;
  })();

  const autofocus = document.querySelector('[autofocus]:not(:focus)');

  if (autofocus) {
    autofocus.focus();
  }

  // http://thednp.github.io/bootstrap.native/
  const elementsToTooltip = document.querySelectorAll('[title]:not([data-disable-tooltip])');

  Array.from(elementsToTooltip).map(
    tip => new BSN.Tooltip(tip, {
      placement: 'bottom',
      animation: 'fade',
      container: 'body',
      delay: 50,
    })
  );
  var pageLoadTime = Math.floor(new Date().getTime() / 1000);
  const expireIcon = document.querySelector('#expirationIcon');

  if (expireIcon) {
    new BSN.Tooltip(expireIcon, {
      placement: 'bottom',
      animation: 'fade',
      container: 'body',
      delay: 50,
    });

    expireIcon.addEventListener('show.bs.tooltip', (event) => {
      const el = event.target;
      const refTime = Number(el.dataset.reftime);
      const curTime = Math.floor(new Date().getTime() / 1000);
      const adjust = pageLoadTime - refTime; // For the purpose of illustration, assume computer clock is faster.
      const remaining = (Number(el.dataset.value) + adjust - curTime);

      if (remaining > 0) {
        el.dataset.title = "Expires in " + Spectre.formatDuration(remaining);
      } else {
        const r = Math.random();

        el.dataset.title = (r <= 0.5) ? "Wha-! It's going to explode! Get out while you still can!" : "He's dead, Jim.";
      }
    }, false);
  }
});
