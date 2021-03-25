import React, { useEffect, useRef } from 'react';

const { Button } = wp.components;
const { Fragment } = wp.element;
const { __, sprintf } = wp.i18n;

/**
 * An XB selector button.
 *
 * @param {object} props Component props.
 * @param {string} props.clientId The block clientId attribute.
 * @param {Array} props.indexes The affected variant indexes.
 * @param {number} props.instance The instance number of the affected XB.
 * @returns {React.ReactNode} The XB selector.
 */
const SelectXB = ( { clientId, indexes, instance } ) => {
	return (
		<div className="altis-xb-selector__item">
			<Button
				isLink
				onClick={ () => {
					const event = new CustomEvent( 'altis-xb-set-variant', {
						detail: {
							clientId,
							variantIndex: indexes[0],
						},
					} );
					window.dispatchEvent( event );
				} }
			>
				{ sprintf( __( 'Go to invalid block %s', 'altis-analytics' ), instance.current ) }
			</Button>
		</div>
	);
};

/**
 * Status check component.
 *
 * @param {object} props Component props.
 * @returns {React.ReactNode} The status check component.
 */
const Status = props => {
	const {
		data,
		message,
		renderStatusIcon,
		status,
	} = props;
	return (
		<Fragment>
			<div className="altis-xb-checklist-message">
				{ renderStatusIcon() }
				{ message }
			</div>
			{ ( status === 'info' || status === 'incomplete' ) && data && (
				<div className="altis-xb-selector">
					{ Object.entries( data ).map( ( [ clientId, indexes ], instance ) => (
						<SelectXB
							clientId={ clientId }
							indexes={ indexes }
							instance={ instance + 1 }
						/>
					) ) }
				</div>
			) }
		</Fragment>
	);
};

export default Status;
