import { getLetter } from '../src/utils';

document.querySelectorAll( '.ab-test-xb-preview' ).forEach( xb => {

	const xbPostId = xb.getAttribute( 'post-id' );
	const templates = document.querySelectorAll( 'template[data-parent-id="' + xb.dataset.clientId + '"]' );
	const tabContainer = xb.querySelector( '.ab-test-xb-preview__tabs' );
	const tabContent = xb.querySelector( '.ab-test-xb-preview__content' );

	const regex = new RegExp( `(utm_campaign|set_test)=test_xb_${ xbPostId }:(\\d+)`, 'i' );
	const url_test = unescape( window.location.search ).match( regex );

	for ( let i = 0; i < templates.length; i++ ) {
		// create a button element
		const tab = document.createElement( 'button' );

		// set the button inner html to the test title
		tab.innerHTML = templates[i].dataset.title;

		// if the title is empty the set the title based on the index
		if ( templates[i].dataset.title === '' ) {
			tab.innerHTML = 'Variant ' + getLetter( i );
		}

		// set the class for the button
		tab.className = 'ab-test-xb-preview__tab';

		tab.addEventListener( 'click', function ( e ) {
			// clone the correspnding data for the tab clicked
			const variant = templates[i].content.cloneNode( true );

			// remove the active class from any tab
			xb.querySelectorAll( '.ab-test-xb-preview__tabs .ab-test-xb-preview__tab' ).forEach( el => {
				el.classList.remove( 'active' );
			} );

			// add the active class
			tab.classList.add( 'active' );
			tabContent.innerHTML = '';

			// append the data
			tabContent.appendChild( variant );
		} );

		// append the created tab
		tabContainer.appendChild( tab );
	}

	// determine if a specific tab should be clicked
	// else click the first tab
	if ( url_test ){
		tabContainer.children[url_test[2]].click();
	} else {
		tabContainer.firstElementChild.click();
	}

} );
