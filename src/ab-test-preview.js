import { getLetter } from '../src/utils';

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const abtest = urlParams.get( 'set_test' );
const abIndex = parseFloat( urlParams.get( 'i' ) );

document.querySelectorAll( '.ab-test-xb-preview' ).forEach( function ( xb ) {

	let templates = document.querySelectorAll( 'template[data-parent-id="' + xb.dataset.clientId + '"]' );
	let tabContainer = document.querySelector( '.ab-test-xb-preview__tabs[data-client-tabs="' + xb.dataset.clientId + '"]' );
	const tabContent = xb.querySelector( '.ab-test-xb-preview__content' );

	for ( let i = 0; i < templates.length; i++ ) {

		const tab = document.createElement( 'button' );

		if ( i === 0 || i === abIndex && xb.dataset.clientId === abtest ){
			const variant = templates[i].content.cloneNode( true );
			tab.className = 'ab-test-xb-preview__tab active';
			tabContent.innerHTML = '';
			tabContent.appendChild( variant );
		} else {
			tab.className = 'ab-test-xb-preview__tab';
		}

		tab.setAttribute( 'data-tab', i );
		tab.innerHTML = 'Variant ' + getLetter( i );

		tab.addEventListener( 'click', function ( e ) {
			const variant = templates[i].content.cloneNode( true );
			document.querySelectorAll( '.ab-test-xb-preview__tabs[data-client-tabs="' + xb.dataset.clientId + '"] .ab-test-xb-preview__tab' ).forEach( function ( el ){
				el.classList.remove( 'active' );
			} );
			tab.className = 'ab-test-xb-preview__tab';
			tab.className += ' active';
			tabContent.innerHTML = '';
			tabContent.appendChild( variant );
		} );

		tabContainer.appendChild( tab );

	}

} );
