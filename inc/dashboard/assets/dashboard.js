/* globals jQuery */
/**
 * Dashboard Analytics
 *
 * JavaScript helpers for the Dashboard Analytics page.
 */

window.dashboardAnalytics = {};

( ( window, $, plugin ) => {
	plugin.table = $( '.post-type-xb table.wp-list-table' );
	plugin.tbody = $( 'tbody#the-list' );
	plugin.orderby = $( 'input[name="orderby"]' );
	plugin.order = $( 'input[name="order"]' );

	/**
	 * Sort the table.
	 *
	 * @param {string} order How to order the table. Accepted values: asc, desc.
	 * @param {string} orderby What column to order the table by. Accepted values: views, conversion.
	 */
	plugin.sortTable = ( order = 'desc', orderby = 'views' ) => {
		// Bail if orderby isn't set or if the order is set to something other than views or conversion.
		if ( ! orderby || ! order || ! [ 'views', 'conversion' ].includes( orderby ) ) {
			return;
		}

		plugin.tbody.find( 'tr' ).sort( ( a, b ) => {
			// Remove the commas and percent symbols from the values and convert them to integers, so we can sort correctly.
			const valueA = parseInt( $( `td.column-${orderby}`, a ).text().replace( /,|%/, '' ) );
			const valueB = parseInt( $( `td.column-${orderby}`, b ).text().replace( /,|%/, '' ) );

			if ( order === 'asc' ) {
				if ( valueA > valueB ) {
					return 1;
				}
				if ( valueB > valueA ) {
					return -1;
				}
				return 0;
			} else {
				if ( valueB > valueA ) {
					return 1;
				}
				if ( valueA > valueB ) {
					return -1;
				}
				return 0;
			}
		} ).appendTo( plugin.tbody );
	};

	/**
	 * Updates the order of the table on a click action.
	 *
	 * @param {string} orderby What column to order the table by. Accepted values: views, conversion.
	 */
	plugin.changeOrder = orderby => {
		const order = plugin.order.val() === 'asc' ? 'desc' : 'asc';
		plugin.order.val( order );
		plugin.orderby.val( orderby );
		plugin.sortTable( order, orderby );
	};

	// On page load, sort the table by whatever the sort order is, or default to views.
	$( window ).on( 'load', plugin.sortTable(
		( plugin.order.length === 0 ) ? 'desc' : plugin.order.val(),
		( plugin.orderby.length === 0 ) ? 'views' : plugin.orderby.val()
	) );

	// When the views heading is clicked, set the orderby to that.
	$( 'th#views a' ).on( 'click', e => {
		// Only prevent the default click behavior if we have an orderby value on the page.
		if ( plugin.orderby.length > 0 ) {
			e.preventDefault();
			plugin.changeOrder( 'views' );
		}
	} );

	// When the conversion heading is clicked, set the orderby to that.
	$( 'th#conversion a' ).on( 'click', e => {
		// Only prevent the default click behavior if we have an orderby value on the page.
		if ( plugin.orderby.length > 0 ) {
			e.preventDefault();
			plugin.changeOrder( 'conversion' );
		}
	} );
} )( window, jQuery, window.dashboardAnalytics );
