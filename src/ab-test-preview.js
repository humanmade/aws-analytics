import { getLetter } from '../src/utils';

const { __, sprintf } = wp.i18n;

/**
 * Create the preview tabs
 */
function createTabbedPreviews() {
	document.querySelectorAll( '.ab-test-xb-preview' ).forEach( xb => {

		const xbPostId = xb.dataset.postId;
		const templates = document.querySelectorAll( 'template[data-parent-id="' + xb.dataset.clientId + '"]' );
		const tabContainer = xb.querySelector( '.ab-test-xb-preview__tabs' );
		const tabContent = xb.querySelector( '.ab-test-xb-preview__content' );

		// Return if we've processed this XB already.
		if ( tabContainer.children.length > 0 ) {
			return;
		}

		const regex = new RegExp( `(utm_campaign|set_test)=test_xb_${ xbPostId }:(\\d+)`, 'i' );
		const urlTest = unescape( window.location.search ).match( regex );

		const totalTemplates = templates.length;

		tabContainer.innerHTML = '';

		for ( let i = 0; i < totalTemplates; i++ ) {
			// create a button element
			const tab = document.createElement( 'button' );

			// if the title is empty the set the title based on the index
			if ( templates[i].dataset.title === '' ) {
				tab.innerHTML = sprintf( __( 'Variant %s', 'altis-analytics' ), getLetter( i ) );
			} else {
				// set the button inner html to the test title
				tab.innerHTML = templates[i].dataset.title;
			}

			// set the class for the button
			tab.className = 'ab-test-xb-preview__tab';

			tab.addEventListener( 'click', function ( e ) {
				// clone the correspnding data for the tab clicked
				const variant = templates[i].content.cloneNode( true );

				// remove the active class from any tab
				tabContainer.querySelectorAll( '.ab-test-xb-preview__tab' ).forEach( el => {
					el.classList.remove( 'active' );
				} );

				// add the active class
				tab.classList.add( 'active' );
				tabContent.innerHTML = '';

				// append the data
				tabContent.appendChild( variant );

				// Dispatch the altisBlockContentChanged event.
				window.dispatchEvent( new CustomEvent( 'altisBlockContentChanged', {
					detail: {
						target: xb,
						preview: true,
					},
				} ) );
			} );

			// append the created tab
			tabContainer.appendChild( tab );
		}

		// determine if a specific tab should be clicked
		// else click the first tab
		if ( urlTest && ( urlTest[2] < totalTemplates ) ) {
			tabContainer.children[urlTest[2]].click();
		} else {
			tabContainer.firstElementChild.click();
		}

	} );
}

// Create the tabs for previewing
createTabbedPreviews();

// When making changes in the customizer
wp.customize.selectiveRefresh.bind( 'sidebar-updated', function () {
	// Create the tabs for previewing
	createTabbedPreviews();
} );
