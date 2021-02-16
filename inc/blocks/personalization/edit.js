import React, { Fragment, useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';
import BlockAnalytics from './components/block-analytics';
import VariantTitle from './components/variant-title';
import VariantPanel from './components/variant-panel';
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
	Toolbar,
} = wp.components;
const { __, sprintf } = wp.i18n;

/**
 * Only variants can be direct descendents so that we can generate
 * usable markup.
 */
const ALLOWED_BLOCKS = [ 'altis/personalization-variant' ];

// Audience picker input.
const Edit = ( {
	attributes,
	className,
	clientId,
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
	}, [] );

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
	}, [] );

	// Track the active variant index to show in the title.
	const activeVariantIndex = variants.findIndex( variant => variant.clientId === activeVariant );

	// Controls that appear before the variant selector buttons.
	const variantsToolbarControls = [
		{
			icon: 'plus',
			title: __( 'Add a variant', 'altis-experiments' ),
			className: 'altis-add-variant-button',
			onClick: () => setVariant( onAddVariant() ),
		},
	];

	// When a variant is removed select the preceeding one along unless it's the first in the list.
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
								<VariantTitle variant={ variant } placeholder={ sprintf( __( 'Variant %d', 'altis-experiments' ), index + 1 ) } />
							</Button>
						) ) }
					</div>
				</Toolbar>
			</BlockControls>
			<InspectorControls>
				<div className="components-panel__body is-opened">
					<BlockAnalytics clientId={ attributes.clientId } />
					<Button
						onClick={ () => setVariant( onAddVariant() ) }
						isSecondary
					>
						{ __( 'Add a variant', 'altis-experiments' ) }
					</Button>
				</div>
				{ variants.map( ( variant, index ) => (
					<VariantPanel
						className={ `variant-settings-${ variant.clientId }` }
						key={ `variant-settings-${ variant.clientId }` }
						variant={ variant }
						placeholder={ sprintf( __( 'Variant %d', 'altis-experiments' ), index + 1 ) }
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
							isTertiary
							isLink
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
						{ __( 'Personalized Content', 'altis-experiments' ) }
						{ ' ・ ' }
						{ variants.length > 0 && (
							<VariantTitle
								variant={ variants[ activeVariantIndex ] }
								placeholder={ sprintf( __( 'Variant %d', 'altis-experiments' ), activeVariantIndex + 1 ) }
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

export default withData( Edit );
