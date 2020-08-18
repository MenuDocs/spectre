(function (window) {
  "use strict";
  window.Spectre = function () {
    var _s2Languages;
    var _languageMap;
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
      loadLanguages: function () {
        var s2Languages = {
          more: false,
          results: [],
        };
        var langmap = {};
        $.ajax({
          url: "/languages.json",
          async: false,
          dataType: "json",
          cache: true,
          success: function (_languages) {
            $.each(_languages, function (i, cat) {
              var s2cat = cat;
              s2cat.text = cat.name;
              s2cat.children = cat.languages;
              $.each(cat.languages, function (i, lang) {
                lang.text = lang.name;

                langmap[lang.id] = lang;
                if (lang.alt_ids) {
                  $.each(lang.alt_ids, function (i, n) {
                    langmap[n] = lang;
                  });
                }
              });
              s2Languages.results.push(s2cat);
            });
          }
        });
        _languageMap = langmap;
        _s2Languages = s2Languages;
        return;
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
        $.ajax({
          type: "GET",
          url: "/partial/" + name,
          async: false,
          dataType: "html",
          success: function (reply) {
            $("#partial_container_" + name).html(reply);
          }
        });
      },
      shouldRefreshPageOnLogin: function () {
        // Right now, only refresh for session (the only other page
        // with a login form)
        return (window.location.pathname.match(/session/) || []).length > 0;
      },
      refreshPage: function () {
        window.location = window.location;
      },
      _loginReplyHandler: function (reply) {
        $("#partial_container_login_logout .blocker").fadeOut("fast");
        switch (reply.status) {
          case "valid":
            $("#login_error").text("").hide(400);
            if (!Spectre.shouldRefreshPageOnLogin()) {
              Spectre.updatePartial("login_logout");
              Spectre.displayFlash({type: "success", body: "Successfully logged in."});
            } else {
              Spectre.refreshPage();
            }
            break;
          case "moreinfo":
            $("#login_error").text("").hide(400);
            if (typeof reply.invalid_fields !== "undefined") {
              $.each(reply.invalid_fields, function (i, v) {
                var field = $("form#loginForm input[name=" + v + "]");
                field.parents(".control-group").eq(0).show(400);
                field.focus();
              });
            }

            if (typeof reply.reason !== "undefined") {
              $("#login_moreinfo").text(reply.reason).show(400);
            }
            break;
          case "invalid":
            if (typeof reply.invalid_fields !== "undefined") {
              $.each(reply.invalid_fields, function (i, v) {
                $("form#loginForm input[name=" + v + "]").parents(".control-group").eq(0).addClass("error");
              });
            }
            if (typeof reply.reason !== "undefined") {
              $("#login_error").text(reply.reason).show(400);
            }
            break;
        }
      },
      login: function (data) {
        $("#partial_container_login_logout .blocker").fadeIn("fast");
        $("form#loginForm .control-group").removeClass("error");
        $.ajax({
          type: "POST",
          url: "/auth/login",
          async: true,
          dataType: "json",
          data: data,
          success: Spectre._loginReplyHandler,
          error: function () {
            $("#partial_container_login_logout .blocker").fadeOut("fast");
          },
        });
      },
      logout: function () {
        $("#partial_container_login_logout .blocker").fadeIn("fast");
        $.ajax({
          type: "POST",
          url: "/auth/logout",
          async: true,
          success: function () {
            $("#partial_container_login_logout .blocker").fadeOut("fast");
            if (!Spectre.shouldRefreshPageOnLogin()) {
              Spectre.updatePartial("login_logout");
              Spectre.displayFlash({type: "success", body: "Successfully logged out."});
            } else {
              Spectre.refreshPage();
            }
          },
          failure: function (wat) {
            $("#partial_container_login_logout .blocker").fadeOut("fast");
            alert(wat);
          }
        });
      },
      displayFlash: function (flash) {
        var container = $("#flash-container");
        var newFlash = container.find("#flash-template").clone();
        newFlash.removeAttr('id').find('p').text(flash.body);
        if (flash.type) {
          newFlash.addClass('well-' + flash.type);
        }
        container.append(newFlash);
        container.show();

        window.setTimeout(function () {
          newFlash.fadeIn(200);
          window.setTimeout(function () {
            newFlash.fadeOut(400, function () {
              container.hide();
              newFlash.remove();
            });
          }, 4000);
        }, 500);
      },
    };
  }();
})(window);

$(function () {
  "use strict";

  const codeEditor = document.querySelector('#code-editor');
  const code = document.querySelector('#code');

  var pasteForm$ = $("#pasteForm");
  var  codeeditor$ = $("#code-editor");
  if (pasteForm$.length > 0) {
    // Initialize the form.
    var langbox = pasteForm$.find("#langbox");
    var context = pasteForm$.data("context");

    Spectre.loadLanguages();

    langbox.select2({
      data: Spectre.languagesForSelect2(),
      matcher: function (term, text, lang) {
        // The ifs here are blown apart so that we might short-circuit.
        if (!lang.id) return false;
        if (lang.name.toUpperCase().indexOf(('' + term).toUpperCase()) >= 0) return true;
        if (lang.id.toUpperCase().indexOf(('' + term).toUpperCase()) >= 0) return true;
        for (var i in lang.alt_ids) {
          if (lang.alt_ids[i].toUpperCase().indexOf(('' + term).toUpperCase()) >= 0) return true;
        }
        return false;
      },
    });
    var lang = Spectre.languageNamed(langbox.data("selected")) ||
      Spectre.defaultLanguage() ||
      Spectre.languageNamed("text");
    langbox.select2("data", lang);

    if (context === "new") {
      pasteForm$.find("input[name='expire']").val(Spectre.defaultExpiration());

      var optModal = $("#optionsModal");
      optModal.modal({show: false});

      optModal.find("input[type='checkbox']").on("change", function () {
        Spectre.setPreference($(this).data("gb-key"), this.checked ? "true" : "false");
      }).each(function () {
        this.checked = Spectre.getPreference($(this).data("gb-key"), "false") === "true";
      });

      $("#optionsButton").on("click", function () {
        optModal.modal("show");
      });
    }
    pasteForm$.on('submit', function () {
      if ((codeeditor$.val().match(/[^\s]/) || []).length !== 0) {
        if (context === "new") {
          if (Spectre.getPreference("saveExpiration", "false") === "true") {
            Spectre.setDefaultExpiration(pasteForm$.find("input[name='expire']").val());
          } else {
            Spectre.clearDefaultExpiration();
          }

          if (Spectre.getPreference("saveLanguage", "false") === "true") {
            Spectre.setDefaultLanguage(langbox.select2("data"));
          } else {
            Spectre.clearDefaultLanguage();
          }
        }
        pasteForm$.find("input[name='title']").val($("#editable-paste-title").text())
      } else {
        $("#deleteModal, #emptyPasteModal").modal("show");
        return false;
      }
    });
    $("#editable-paste-title").keypress(function (e) {
      if (e.which == 13) {
        $(codeeditor$).focus();
        return false;
      }
      return true;
    });
  }

  (function () {
    var controls = $("#paste-controls");
    if (controls.length === 0) return;

    controls.onMediaQueryChanged("screen and (max-width: 767px)", function (mql) {
      this.detach();
      var newParent;
      if (mql.matches) {
        newParent = $("#phone-paste-control-container");
      } else {
        newParent = $("#desktop-paste-control-container");
      }
      newParent.prepend(this);
    });
  })();
  (function () {
    var encModal = $("#encryptModal");
    if (encModal.length === 0) return;

    encModal.modal({show: false});
    var modalPasswordField = encModal.find("input[type='password']"),
      pastePasswordField = pasteForm$.find("input[name='password']");

    modalPasswordField.keypress(function (e) {
      if (e.which === 13) {
        encModal.modal("hide");
        return false;
      }
    });

    var setEncrypted = function (encrypted) {
      $("#encryptionIcon").removeClass("icon-lock icon-lock-open-alt").addClass(encrypted ? "icon-lock" : "icon-lock-open-alt");
      $("#encryptionButton .button-data-label").text(encrypted ? "On" : "");
    };

    encModal.on("show", function () {
      modalPasswordField.val(pastePasswordField.val());
    }).on("shown", function () {
      $(this).find("input").eq(0).focus().select();
    }).on("hidden", function () {
      pastePasswordField.val(modalPasswordField.val());
      setEncrypted($(this).find("input").val().length > 0);
    });

    $("#encryptionButton").on("click", function () {
      encModal.modal("show");
    });
  })();
  (function () {
    var expModal = $("#expireModal");
    if (expModal.length === 0) return;

    expModal.modal({show: false});

    var expInput = pasteForm$.find("input[name='expire']");
    var expDataLabel = $("#expirationButton .button-data-label");

    var setExpirationSelected = function () {
      $(this).button('toggle');
      expInput.val($(this).data("value"));
      expDataLabel.text($(this).data("display-value"));
    };

    setExpirationSelected.call(expModal.find("button[data-value='" + expInput.val() + "']"));
    expModal.find("button[data-value]").on("click", function () {
      setExpirationSelected.call(this);
      expModal.modal("hide");
    });

    $("#expirationButton").on("click", function () {
      expModal.modal("show");
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

      /*const mql = window.matchMedia('(max-width: 600px)');

      mql.addEventListener('change', (e) => {
        console.log(e);
      });

      // TODO: wat?
      $(document).on("media-query-changed", function() {
        positionLinebar$.call($("span:nth-child("+permabar$.data("cur-line")+")", lineNumberTrough).get(0), permabar$);
      });*/
    } else if (codeEditor) {
      ['input', 'propertychange'].forEach((eName) => {
        codeEditor.addEventListener(eName, () => {
          const lines = (codeEditor.value.match(/\n/g) || []).length + 1;
          fillWithLineNumbers(lineNumbers, lines).then(() => {
            document.querySelector('.textarea-height-wrapper')
              .style.left = `${lineNumbers.offsetWidth}px`;
          })
            .catch(() => { /* Just ignore */ });
        });
      });

      const inputEvent = document.createEvent('HTMLEvents');

      inputEvent.initEvent('input', true, false);
      codeEditor.dispatchEvent(inputEvent);

      /*codeeditor$.on("input propertychange", function () {
        lineNumberTrough.fillWithLineNumbers((codeeditor$.val().match(/\n/g) || []).length + 1, function () {
          $(".textarea-height-wrapper").css("left", lineNumberTrough.outerWidth());
        });
      }).triggerHandler("input");
      // TODO: if stuff breaks, find a way to implement this
      $(document).on("media-query-changed", function () {
        codeeditor$.triggerHandler("input");
      });*/
    }
  })();
  (function () {
    if (!codeEditor) {
      return;
    }

    codeEditor.addEventListener('keydown', (e) => {



    });

    if (codeeditor$.length > 0) {
      codeeditor$.keydown(function (e) {
        // indent selected code
        // 9 is tab
        if (e.keyCode === 9 && !e.ctrlKey && !e.altKey && !e.shiftKey) {
          e.cancelBubble = true;
          e.preventDefault();

          var ends = [this.selectionStart, this.selectionEnd];
          this.value = this.value.substring(0, ends[0]) + "\t" + this.value.substring(ends[1], this.value.length);
          this.selectionStart = this.selectionEnd = ends[0] + 1;
          return false;
        }
        // good old ctrl+s
        // 83 is the "s" key
        if (e.keyCode === 83 && e.ctrlKey && !e.altKey && !e.shiftKey) {
          pasteForm$.submit();
          return false;
        }
      });

      var changed = false;
      codeeditor$.on("input propertychange", function () {
        changed = true;
      });

      pasteForm$.on("submit", function () {
        changed = false;
      });

      var deleteForm = $("[name='deleteForm']");

      deleteForm.on("submit", function () {
        changed = false;
      });

      window.addEventListener("beforeunload", function (e) {
        if (!changed) {
          return;
        }
        var confirmationMessage = "If you leave now, your paste will not be saved.";
        (e || window.event).returnValue = confirmationMessage;
        return confirmationMessage;
      });
    }
  })();

  $('[autofocus]:not(:focus)').eq(0).focus();
  $('[title]:not([data-disable-tooltip])').tooltip({
    trigger: "hover",
    placement: "bottom",
    container: "body",
    delay: {
      show: 250,
      hide: 50,
    },
  });
  var pageLoadTime = Math.floor(new Date().getTime() / 1000);
  $('#expirationIcon').tooltip({
    trigger: "hover",
    placement: "bottom",
    container: "body",
    title: function () {
      var refTime = (0 + $(this).data("reftime"));
      var curTime = Math.floor(new Date().getTime() / 1000);
      var adjust = pageLoadTime - refTime; // For the purpose of illustration, assume computer clock is faster.
      var remaining = ((0 + $(this).data("value")) + adjust - curTime);
      if (remaining > 0) {
        return "Expires in " + window.Spectre.formatDuration(remaining);
      } else {
        var r = Math.random();
        return (r <= 0.5) ? "Wha-! It's going to explode! Get out while you still can!" : "He's dead, Jim.";
      }
    },
    delay: {
      show: 250,
      hide: 50,
    },
  });
});

$(function () {
  if (docCookies.hasItem("flash")) {
    var flash = JSON.parse(atob(docCookies.getItem("flash")));
    docCookies.removeItem("flash", "/");
    Spectre.displayFlash(flash);
  }
});
