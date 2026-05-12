(async () => {
	var _apPath = window.location.pathname;
	if (!_apPath.endsWith('/wp-admin/post.php') && !_apPath.endsWith('/wp-admin/post-new.php')) return;
	if (!document.body.classList.contains('post-type-touch_point')) return;
	console.log(window.location.pathname);
	const waitUntilElementsShow = (selectors) => new Promise((resolve) => {
		const els = [];
		let _interval = setInterval(() => {
			selectors.forEach((selector, index) => {
				els[index] = document.querySelector(selector);
			});
			const lengthOfEl = els.filter(Boolean).length;
			if (lengthOfEl === selectors.length) {
				clearInterval(_interval);
				resolve(els);
			}
		}, 500);
	});
	const wait = (miliseconds) => new Promise(resolve => {
		setTimeout(resolve, miliseconds);
	});

	const els = await waitUntilElementsShow(['#pods-meta-touch-point', '#pods-form-ui-pods-meta-left', '#pods-form-ui-pods-meta-top', '#pods-form-ui-pods-meta-type-map', '#pods-form-ui-pods-meta-json']);
	await wait(300);
	const touchpointBox = els[0];
	const leftInput = els[1];
	const topInput = els[2];
	const typeMapSelect = els[3];
	const jsonInput = els[4];
	if (!touchpointBox) { console.log('Can not find touchpointBox'); }
	const inside = touchpointBox.querySelector('.inside');
	if (!inside) { console.log('Can not find inside'); }

	// Aspect ratios match MapWeb imageResolution (Outside / Inside)
	const mapAspectRatios = {
		Outside: '21674 / 9804',
		Inside: '20000 / 11454'
	};
	const setAspectRatioByType = (type) => {
		const ratio = mapAspectRatios[type] || mapAspectRatios.Outside;
		inside.style.aspectRatio = ratio;
		inside.style.width = '100%';
		const wrapper = document.getElementById('touch-point-picker-wrapper');
		if (wrapper) wrapper.style.aspectRatio = ratio;
	};
	setAspectRatioByType(typeMapSelect.value);
	inside.style.position = 'relative';
	inside.style.overflow = 'hidden';
	inside.style.maxWidth = '100%';
	inside.style.padding = '0';

	const updateIframeUrl = () => {
		const selectedValue = typeMapSelect.value;
		setAspectRatioByType(selectedValue);
		let iframeUrlQuery = '';
		if (jsonInput.value) {
			iframeUrlQuery = `?markers=${encodeURIComponent(jsonInput.value)}`;
		} else if (leftInput.value && topInput.value) {
			iframeUrlQuery = `?top=${topInput.value}&left=${leftInput.value}`;
		}
		const iframe = document.getElementById('touch-point-picker');
		const siteSlug = typeof airportGetIframeSiteSlugPrefix === 'function' ? airportGetIframeSiteSlugPrefix() : '';
		const isDevDomain = window.location.hostname === 'cms.dev-amadeus-airport.devserver.london';

		if (iframe) {
			if (selectedValue === 'Inside') {
				iframe.src = `https://${isDevDomain ? 'dev-' : ''}amadeus-airport.devserver.london/${siteSlug}touch-point-picker-inside${iframeUrlQuery}`;
			} else {
				iframe.src = `https://${isDevDomain ? 'dev-' : ''}amadeus-airport.devserver.london/${siteSlug}touch-point-picker${iframeUrlQuery}`;
			}
		}
	};

	let initialIframeUrlQuery = '';
	if (jsonInput.value) {
		initialIframeUrlQuery = `?markers=${encodeURIComponent(jsonInput.value)}`;
	} else if (leftInput.value && topInput.value) {
		initialIframeUrlQuery = `?top=${topInput.value}&left=${leftInput.value}`;
	}
	const isDevDomain = window.location.hostname === 'cms.dev-amadeus-airport.devserver.london';
	const siteSlug = typeof airportGetIframeSiteSlugPrefix === 'function' ? airportGetIframeSiteSlugPrefix() : '';
	inside.insertAdjacentHTML('beforeend', `
			<div style="position: absolute; top: 0; left:0; bottom: 0; right:0; background-color: white; overflow: hidden;">
			  <div style="position: absolute; top: 0; left:0; bottom: 0; right:0; display: flex; justify-content: center; align-items: center; pointer-events: none;">
	             <p>Loading...</p>
	          </div>
              <div id="touch-point-picker-wrapper" style="position: absolute; top: 0; left:0; bottom: 0; right:0; aspect-ratio: ${mapAspectRatios[typeMapSelect.value] || mapAspectRatios.Outside}; max-width: 100%; max-height: 100%; overflow: hidden;">
	             <iframe id="touch-point-picker" src="https://${isDevDomain ? 'dev-' : ''}amadeus-airport.devserver.london/${siteSlug}touch-point-picker${initialIframeUrlQuery}" style="border: none; width: 100%; height: 100%; max-width: 100%; max-height: 100%; display: block;"></iframe>
              </div>
	        </div>
		`);
	typeMapSelect.addEventListener('change', updateIframeUrl);
	updateIframeUrl();
	window.addEventListener('message', event => {
		if (event.data && event.data.type === 'touch-point') {
			const markers = event.data.data;
			if (Array.isArray(markers)) {
				jsonInput.value = JSON.stringify(markers);
				if (markers.length === 1) {
					leftInput.value = markers[0].left;
					topInput.value = markers[0].top;
				} else {
					leftInput.value = '';
					topInput.value = '';
				}
			}
		}
	});
})();
