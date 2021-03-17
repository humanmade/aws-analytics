import React, { Fragment, useEffect, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';

import Popup from '../../../src/blocks/ui/popup';

import VariantPanel from './components/variant-panel';
import VariantTitle from './components/variant-title';
import VariantToolbar from './components/variant-toolbar';
import withData from './data/edit';

const {
	BlockControls,
	InnerBlocks,
	InspectorControls,
} = wp.blockEditor;
const {
	Button,
	PanelBody,
	TextControl,
	Toolbar,
} = wp.components;
const { __, sprintf } = wp.i18n;

/**
 * Only variants can be direct descendents so that we can generate
 * usable markup.
 */
const ALLOWED_BLOCKS = [ 'altis/personalization-variant' ];

/**
 * Audience picker input.
 *
 * @param {React.ComponentProps} props The component props.
 * @param {object} props.attributes Block attributes object.
 * @param {string} props.className Block class name.
 * @param {string} props.clientId The block client ID.
 * @param {object} props.currentPost The currently edited post object.
 * @param {boolean} props.isSelected True if the block is currently selected in the editor.
 * @param {Function} props.onAddVariant Function to add a new variant.
 * @param {Function} props.onCopyVariant Function to copy an existing variant.
 * @param {Function} props.onRemoveVariant Function to remove a variant.
 * @param {Function} props.setAttributes Function to set block attributes.
 * @param {Array} props.variants The block content variant objects.
 * @returns {React.ReactNode} The block edit component.
 */
const Edit = ( {
	attributes,
	className,
	clientId,
	currentPost,
	isSelected,
	onAddVariant,
	onCopyVariant,
	onRemoveVariant,
	setAttributes,
	variants,
} ) => {
	// Set the block clientId if none currently set.
	useEffect( () => {
		if ( ! attributes.clientId ) {
			setAttributes( { clientId: uuid() } );
		}
	}, [ attributes.clientId, setAttributes ] );

	// If currently editing the XB post directly update the title from the main post title.
	useEffect( () => {
		if ( currentPost.type === 'xb' ) {
			setAttributes( { title: currentPost.title } );
		}
	}, [ currentPost.title, currentPost.type, setAttributes ] );

	// Track the instance number for this block, only needs to be set when block is selected.
	const instance = useRef( null );
	useEffect( () => {
		if ( ! instance.current ) {
			instance.current = ++Edit.instanceNumber;
		}
	}, [ isSelected ] );

	// Track currently selected variant.
	const defaultVariantClientId = ( variants.length > 0 && variants[ 0 ].clientId ) || null;
	const [ activeVariant, setVariant ] = useState( defaultVariantClientId );

	// Track previous client ID for undo button.
	const [ prevClientId, setPrevClientId ] = useState();

	// Add a default fallback variant if none present.
	useEffect( () => {
		// Ensure at least one variant is present as a fallback.
		// Note TEMPLATE does not seem to have the desired effect every time.
		if ( variants.length === 0 ) {
			setVariant( onAddVariant( { fallback: true } ) );
		}
	}, [ variants.length, onAddVariant ] );

	// Track the active variant index to show in the title.
	const activeVariantIndex = variants.findIndex( variant => variant.clientId === activeVariant );

	// Controls that appear before the variant selector buttons.
	const variantsToolbarControls = [
		{
			icon: 'plus',
			title: __( 'Add a variant', 'altis-experiments' ),
			className: 'altis-add-variant-button',
			/**
			 * Adds a new variant.
			 *
			 * @returns {string} New variant block client ID.
			 */
			onClick: () => setVariant( onAddVariant() ),
		},
	];

	/**
	 * When a variant is removed select the preceeding one along unless it's the first in the list.
	 */
	const onRemove = () => {
		if ( activeVariantIndex === 0 ) {
			setVariant( variants[ activeVariantIndex + 1 ].clientId );
		} else {
			setVariant( variants[ activeVariantIndex - 1 ].clientId );
		}
		onRemoveVariant( activeVariant );
	};

	return (
		<Fragment>
			<BlockControls>
				<Toolbar
					className="altis-variants-toolbar"
					controls={ variantsToolbarControls }
				>
					<div className="altis-variants-toolbar__tabs">
						{ variants.map( ( variant, index ) => (
							<Button
								key={ `variant-select-${ variant.clientId }` }
								className={ `altis-variant-button components-icon-button has-text ${ activeVariant === variant.clientId && 'is-active' }` }
								title={ __( 'Select variant', 'altis-experiments' ) }
								onClick={ () => setVariant( variant.clientId ) }
							>
								<VariantTitle placeholder={ sprintf( __( 'Variant %d', 'altis-experiments' ), index + 1 ) } variant={ variant } />
							</Button>
						) ) }
					</div>
				</Toolbar>
			</BlockControls>
			<InspectorControls>
				<div className="components-panel__body is-opened">
					{ currentPost.type !== 'xb' && (
						<TextControl
							label={ <strong>{ __( 'Block Title', 'altis-analytics' ) }</strong> }
							placeholder={ sprintf( __( '%s (XB %d)', 'atlis-analytics' ), currentPost.title, instance.current ) }
							value={ attributes.title || '' }
							onChange={ title => setAttributes( { title } ) }
						/>
					) }
					<Popup clientId={ attributes.clientId } />
					<Button
						isSecondary
						onClick={ () => setVariant( onAddVariant() ) }
					>
						{ __( 'Add a variant', 'altis-experiments' ) }
					</Button>
				</div>
				{ variants.map( ( variant, index ) => (
					<VariantPanel
						key={ `variant-settings-${ variant.clientId }` }
						className={ `variant-settings-${ variant.clientId }` }
						placeholder={ sprintf( __( 'Variant %d', 'altis-experiments' ), index + 1 ) }
						variant={ variant }
					/>
				) ) }
				<PanelBody title={ __( 'Reset Analytics Data', 'altis-experiments' ) }>
					<p><em>{ __( 'Editing an experience block may make the existing analytics data meaningless, for example when changing conversion goals or making significant changes to the content.' ) }</em></p>
					<p>{ __( 'You can reset the tracking data for this block to ensure it is relevant by clicking the button below.' ) }</p>
					<Button
						isDestructive
						onClick={ () => {
							setPrevClientId( attributes.clientId );
							setAttributes( { clientId: uuid() } );
						} }
					>
						{ __( 'Reset', 'altis-experiments' ) }
					</Button>
					{ ' ' }
					{ prevClientId && (
						<Button
							isLink
							isTertiary
							onClick={ () => {
								setPrevClientId( null );
								setAttributes( { clientId: prevClientId } );
							} }
						>
							{ __( 'Undo', 'altis-experiments' ) }
						</Button>
					) }
				</PanelBody>
			</InspectorControls>
			<style dangerouslySetInnerHTML={ {
				__html: `
					[data-block="${ clientId }"] [data-type="altis/personalization-variant"] {
						display: none;
					}
					[data-block="${ clientId }"] [data-type="altis/personalization-variant"][data-block="${ activeVariant }"] {
						display: block;
					}
				`,
			} } />
			<div className={ className }>
				<div className="wp-core-ui altis-experience-block-header">
					<span className="altis-experience-block-header__title">
						{ ! attributes.title && __( 'Personalized Content', 'altis-experiments' ) }
						{ attributes.title }
						{ ' ・ ' }
						{ variants.length > 0 && (
							<VariantTitle
								placeholder={ sprintf( __( 'Variant %d', 'altis-experiments' ), activeVariantIndex + 1 ) }
								variant={ variants[ activeVariantIndex ] }
							/>
						) }
					</span>
					{ isSelected && (
						<VariantToolbar
							canRemove={ variants.length > 1 }
							isFallback={ activeVariant && variants[ activeVariantIndex ].attributes.fallback }
							onCopy={ () => setVariant( onCopyVariant( activeVariant ) ) }
							onRemove={ onRemove }
						/>
					) }
				</div>
				<InnerBlocks
					allowedBlocks={ ALLOWED_BLOCKS }
					renderAppender={ false }
				/>
			</div>
		</Fragment>
	);
};

Edit.instanceNumber = 0;

export default withData( Edit );
