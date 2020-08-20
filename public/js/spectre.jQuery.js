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

  const listener = (e) => {
    if(e.matches === lastMqlMatch) {
      return;
    }

    callback(e);
    lastMqlMatch = e.matches;

    const MQCEvent = new CustomEvent('media-query-changed', {
      detail: e
    });

    document.dispatchEvent(MQCEvent);
  };

  listener(mql);
  mql.addEventListener('change', listener);
}

// used in _user.tmpl
function serializeForm (form) {
  const out = {};

  for (const input of form.querySelectorAll('input')) {
    out[input.name] = input.value;
  }

  return out;
}

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

function findParentWithClass(el, cls) {
  let target = el;

  while (true) {
    if (!target.classList.contains(cls)) {
      target = target.parentNode;
      continue;
    }

    return target;
  }
}

function animateCSS(element, animation, prefix = 'animate__') {
  // We create a Promise and return it
  return new Promise((resolve, reject) => {
    const animationName = `${prefix}${animation}`;
    const node = typeof element === 'string' ? document.querySelector(element) : element;

    node.classList.add(`${prefix}animated`, animationName);

    // When the animation ends, we clean the classes and resolve the Promise
    function handleAnimationEnd() {
      node.classList.remove(`${prefix}animated`, animationName);
      node.removeEventListener('animationend', handleAnimationEnd);

      resolve('Animation ended');
    }

    node.addEventListener('animationend', handleAnimationEnd);
  });
}
