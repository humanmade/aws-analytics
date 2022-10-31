/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useEffect, useState } from 'react';

/**
 * Audience Preview Selector.
 *
 * @returns {React.ReactNode} Selector component.
 */
export default function Selector() {
	const [ selected, setSelected ] = useState( Altis.Analytics.getAudiences() );
	const {
		audiences,
		editLabel,
		editUrl,
		label,
	} = window.AltisExperimentsPreview;

	// Update the selected audiences on the first update event as
	// the analytics ready event can fire before the audiences have been calculated.
	useEffect( () => {
		setSelected( Altis.Analytics.getAudiences() );
		const listener = Altis.Analytics.on( 'updateAudiences', () => {
			setSelected( Altis.Analytics.getAudiences() );
		} );
		return () => {
			Altis.Analytics.off( listener );
		};
	}, [] );

	/**
	 * Check selected status of Audience by ID.
	 *
	 * @param {number} id Audience ID.
	 * @returns {boolean} True if selected.
	 */
	const isSelected = id => selected.indexOf( id ) >= 0;
	/**
	 * Handle toggling of audiences.
	 *
	 * @param {Event} e Event object.
	 * @param {number} id The audience ID.
	 */
	const onClick = ( e, id ) => {
		e.preventDefault();

		if ( selected.indexOf( id ) >= 0 ) {
			const nextSelected = selected.filter( val => val !== id );
			setSelected( nextSelected );
			Altis.Analytics.overrideAudiences( nextSelected );
		} else {
			const nextSelected = [ ...selected, id ];
			setSelected( nextSelected );
			Altis.Analytics.overrideAudiences( nextSelected );
		}
	};
	/**
	 * Prevent link default on click.
	 *
	 * @param {Event} e Event object.
	 */
	const onClickPrevent = e => {
		e.preventDefault();
	};

	return (
		<>
			<a
				className="ab-item"
				href="#audience-preview"
				onClick={ e => onClickPrevent( e ) }
			>
				{ label }
			</a>
			<div className="ab-sub-wrapper">
				<ul className="ab-submenu">
					{ audiences.map( audience => (
						<li
							key={ audience.id }
							className="aa-preview-item"
						>
							<a
								className={ `ab-item ${ isSelected( audience.id ) ? 'altis-analytics-preview-selected' : '' }` }
								href="#"
								role="button"
								onClick={ e => onClick( e, audience.id ) }
							>
								{ audience.title }
							</a>
						</li>
					) ) }
					{ audiences.length === 0 && (
						<li>
							<a
								className="ab-item"
								href={ editUrl }
							>
								{ editLabel }
							</a>
						</li>
					) }
				</ul>
			</div>
		</>
	);
}
