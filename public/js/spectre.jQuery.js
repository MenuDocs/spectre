function fillWithLineNumbers(el, lines) {
	if (lines === Number(el.dataset.lines)) {
		return Promise.reject();
	}

	let out = '';

	for (let i = 1; i <= lines; i++) {
		out += `<span id="L${i}">${i}</span>`;
	}

	el.innerHTML = out;
	el.dataset.lines = lines;

	return Promise.resolve();
}

function listenForEvents(events, el, callback) {
  for (const event of events) {
    el.addEventListener(event, (e) => callback(e));
  }
}

function scrollMinimal (el) {
	const cTop = el.getBoundingClientRect().top + document.body.scrollTop;
	const cHeight = el.offsetHeight;
	const windowTop = window.pageYOffset;
	const visibleHeight = window.innerHeight;

	if (cTop < windowTop) {
		window.scrollTo({
			top: cTop
		});
	} else if (cTop + cHeight > windowTop + visibleHeight) {
		window.scrollTo({
			top: cTop - (visibleHeight / 2)
		});
	}
}

function onMediaQueryChanged (mediaQuery, callback) {
  const mql = window.matchMedia(mediaQuery);
  let lastMqlMatch;

  mql.addEventListener('change', (e) => {
    if(e.matches === lastMqlMatch) {
      return;
    }

    callback(e);
    lastMqlMatch = e.matches;

    const MQCEvent = new CustomEvent('media-query-changed', {
      detail: e
    });

    document.dispatchEvent(MQCEvent);
  });
}

(function($){
	"use strict";
	$.fn.serializeObject = function() {
		var self = this;
		var object = {};
		$.each($(self).serializeArray(), function(i, v) {
			object[v["name"]] = v["value"];
		});
		return object;
	};
})(jQuery);

const theEvents = ['change', 'keydown', 'keypress', 'input'];

/**
 *
 * @param {Event|KeyboardEvent} event
 */
function dataPlaceHolderListener(event) {
	const el = event.target;

	if (el.textContent) {
		el.setAttribute('data-div-placeholder-content', 'true');
	} else {
		el.removeAttribute('data-div-placeholder-content');
	}
}

listenForEvents(theEvents, document, (event) => {
  const dataset = event.target.dataset;

  if (dataset && dataset.placeholder) {
    dataPlaceHolderListener(event);
  }
});

document.addEventListener('DOMContentLoaded', () => {
	const changeEvent = new CustomEvent('change');

	document.querySelectorAll('*[data-placeholder]')
    .forEach((el) => el.dispatchEvent(changeEvent));
});
