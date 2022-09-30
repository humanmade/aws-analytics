import debouncePromise from 'debounce-promise';
import _deburr from 'lodash/deburr';

import { Fragment, useState, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { addQueryArgs } from '@wordpress/url';

import BroadcastIcon from './icon.js';

const {
	Button,
	Icon,
	TextControl,
	Spinner,
} = wp.components;

const {
	InspectorControls,
} = wp.blockEditor;

const apiFetch = wp.apiFetch;

/**
 * Block edit component.
 *
 * @param {*} props
 *
 * @returns {ReactElement}
 */
const EditComponent = function ( props ) {
	const {
		attributes,
		setAttributes,
		clientId,
	} = props;

	const [ broadcast, _setBroadcast ] = useState( null );
	const [ broadcasts, setBroadcasts ] = useState( [] );
	const [ isFetching, setIsFetching ] = useState( false );
	const [ searchKeyword, _setSearchKeyword ] = useState( '' );

	const fetchBroadcasts = debouncePromise( function ( keyword, extraArgs ) {
		const args = {
			path: addQueryArgs( '/accelerate/v1/broadcast', { search: keyword } ),
			parse: false,
			...extraArgs,
		};

		return apiFetch( args )
			.then( response => response.json ? response.json() : [] );
	}, 1000 );

	const fetchBroadcast = debouncePromise( function ( id, extraArgs ) {
		const args = {
			path: addQueryArgs( `accelerate/v1/broadcast/${ id }` ),
			parse: false,
			...extraArgs,
		};

		return apiFetch( args ).then( response => response.json ? response.json() : null );
	}, 1000 );

	/**
	 * Select a Broadcast block.
	 *
	 * @param {*} broadcast Broadcast block metadata
	 * @returns {void}
	 */
	const setBroadcast = function ( broadcast ) {
		if ( ! broadcast && ! window.confirm( __( 'Are you sure you want to replace this Broadcast?', 'altis' ) ) ) {
			return;
		}
		_setBroadcast( broadcast );
		setAttributes( { broadcast: broadcast?.id } );
	};

	/**
	 * Normalize and set search keyword.
	 *
	 * @param {string} keyword Search keyword.
	 */
	const setSearchKeyword = function ( keyword ) {
		// Disregard diacritics.
		//  Input: "média"
		keyword = _deburr( keyword );

		// Accommodate leading slash, matching autocomplete expectations.
		//  Input: "/media"
		keyword = keyword.replace( /^\//, '' );

		// Strip leading and trailing whitespace.
		//  Input: " media "
		keyword = keyword.trim();

		_setSearchKeyword( keyword );
	};

	// Set the block clientId if none currently set.
	useEffect( () => {
		if ( ! attributes.clientId ) {
			setAttributes( { clientId } );
		}
	}, [ attributes.clientId, setAttributes ] );

	// Fetch the broadcast post if we have one selected already.
	useEffect( () => {
		const abortController = new AbortController();
		if ( attributes.broadcast && ! broadcast?.id ) {
			fetchBroadcast( attributes.broadcast, { signal: abortController.signal } ).then( setBroadcast );
		}

		return () => abortController.abort();
	}, [ attributes.broadcast ] );

	// Search broadcasts, and load initial broadcast list.
	useEffect( () => {
		const abortController = new AbortController();
		setIsFetching( true );
		fetchBroadcasts( searchKeyword, { signal: abortController.signal } )
			.then( setBroadcasts )
			.catch( () => {
				setBroadcasts( [] );
			} )
			.finally( () => setIsFetching( false ) );

		return () => abortController.abort();
	}, [ searchKeyword ] );

	// Clear search term when a broadcast is selected.
	useEffect( () => {
		if ( broadcast ) {
			setSearchKeyword( '' );
		}
	}, [ broadcast ] );

	return (
		<Fragment>
			<InspectorControls>
				<div className="components-panel__body is-opened">
					<Button
						href={ window.Altis.Analytics.Broadcast.ManagerURL }
						icon="external"
						isSecondary
						title={ __( 'Go to Broadcast Manager', 'altis' ) }
					>
						{ __( 'Broadcast Manager', 'altis' ) }
					</Button>
				</div>
			</InspectorControls>
			<div className="altis-broadcast-block">
				<div className="wp-core-ui altis-broadcast-block-header">
					<div className="altis-broadcast-block-header__title">
						<Icon icon={ BroadcastIcon } />
						{ __( 'Broadcast', 'altis' ) }
						<p className="altis-broadcast-block-header__desc">
							{ __( 'Broadcast your blocks to a larger audience.', 'altis' ) }
						</p>

					</div>
					<div className="altis-broadcast-block-header__toplink">
						<a href={ window.Altis.Analytics.Broadcast.ManagerURL }>
							{ __( 'Broadcast Manager', 'altis' ) }
						</a>
					</div>
				</div>
				<div className="wp-core-ui block-editor-reusable-blocks-inserter">
					{ attributes.broadcast
						? (
							<div className="altis-broadcast-blocks-inserter__title">
								{ broadcast
									? (
										<>
											{ __( 'Broadcasting:', 'altis' ) }
											{ ' ' }
											<strong>{ broadcast.title.rendered }</strong>
											<Icon className="altis-broadcast-blocks-inserter__remove-broadcast" icon="no" onClick={ () => setBroadcast( null ) } />
										</>
									) : (
										<Spinner className="altis-broadcast-block-list__list-loading" />
									)
								}
							</div>
						) : (
							<>
								<div className="block-editor-reusable-blocks-inserter__filter">
									<TextControl
										className="block-editor-reusable-blocks-inserter__filter-search-keyword"
										label={ null }
										placeholder={ __( 'Search Broadcasts', 'altis' ) }
										value={ searchKeyword }
										onChange={ setSearchKeyword }
									/>
									{ broadcasts.length > 0 && (
										<Icon icon="arrow-down" onClick={ () => setSearchKeyword( null ) } />
									) }
								</div>
								<div className="altis-broadcast-block-list__list">
									{ isFetching
										? <Spinner className="altis-broadcast-block-list__list-loading" />
										: broadcasts.length > 0
											? (
												<ul className="altis-broadcast-block-list">
													{
														broadcasts.map( item => (
															<li className="altis-broadcast-block-list__list-item">
																<Button onClick={ () => setBroadcast( item ) }>
																	{ item.title.rendered }
																</Button>
															</li>
														) )
													}
												</ul>
											)
											: (
												<div className="altis-broadcast-block-list__list-empty">
													{ __( 'No Broadcasts matching this title were found.', 'altis' ) }
												</div>
											) }
								</div>
							</>
						) }
				</div>
			</div>
		</Fragment>
	);
};

export default EditComponent;
