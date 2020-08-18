function fillWithLineNumbers(el, lines) {
	if (lines === Number(el.dataset.lines)) {
		return;
	}

	let out = '';

	for (let i = 1; i <= lines; i++) {
		out += `<span id="L${i}">${i}</span>`;
	}

	el.innerHTML = out;
	el.dataset.lines = lines;

	return Promise.resolve();
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

(function($){
	"use strict";
	$.fn.fillWithLineNumbers = function(lines, callback) {
		var lineNumberTrough = $(this[0]);
		if(lines === (0+lineNumberTrough.data("lines"))) return;

		var n="";
		var i = 0;
		for(i=0; i < lines; i++) {
			n += '<span id="L'+(i+1)+'">'+(i+1)+"</span>";
		}
		lineNumberTrough.html(n);

		lineNumberTrough.data("lines", lines);
		if(callback) callback();
	};
	$.fn.onMediaQueryChanged = function(mediaQuery, callback) {
		var self = this;
		var mql = window.matchMedia(mediaQuery);
		var lastMqlMatch;
		var mqlListener = function(mql) {
			if(mql.matches === lastMqlMatch) return;
			callback.call(self, mql);
			lastMqlMatch = mql.matches;
			$(document).trigger("media-query-changed", mql);
		};
		mqlListener(mql);
		mql.addListener(mqlListener);
	};
	$.fn.serializeObject = function() {
		var self = this;
		var object = {};
		$.each($(self).serializeArray(), function(i, v) {
			object[v["name"]] = v["value"];
		});
		return object;
	};
})(jQuery);

/* From https://github.com/sprucemedia/jQuery.divPlaceholder.js */
/*(function ($) {
        $(document).on('change keydown keypress input', '*[data-placeholder]', function() {
                if (this.textContent) {
                        this.setAttribute('data-div-placeholder-content', 'true');
                }
                else {
                        this.removeAttribute('data-div-placeholder-content');
                }
        });
	$(function() {
		$("*[data-placeholder]").trigger("change");
	});
})(jQuery);*/

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

for (const e of theEvents) {
	document.addEventListener(e, (event) => {
		const dataset = event.target.dataset;

		if (dataset && dataset.placeholder) {
			dataPlaceHolderListener(event);
		}
	});
}

document.addEventListener('DOMContentLoaded', () => {
	const changeEvent = document.createEvent('HTMLEvents');
	changeEvent.initEvent('change', true, false);

	document.querySelectorAll('*[data-placeholder]').forEach((el) => el.dispatchEvent(changeEvent));
});
