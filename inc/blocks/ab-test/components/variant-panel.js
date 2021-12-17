import React from 'react';
import styled from 'styled-components';

import GoalPicker from '../../personalization/components/goal-picker';

const {
	PanelBody,
	TextControl,
	RangeControl,
	Button,
	Icon,
} = wp.components;
const {
	useDispatch,
	useSelect,
} = wp.data;
const { __ } = wp.i18n;

const Preview = styled( Button ).attrs( {
	isLink: true,
} )`
	text-align: right;
	flex: 0;
	align-self: flex-end;
	font-size: inherit;

	.dashicon {
		width: auto;
		font-size: inherit;
		line-height: inherit;
		vertical-align: baseline;
	}

	svg.dashicon, .dashicon svg {
		width: 0.9rem;
		margin-left: 2px;
	}
`;

/**
 * Variant settings panel.
 *
 * @param {React.ComponentProps} props The component props.
 * @param {object} props.variant The variant block object.
 * @param {React.ReactNode} props.placeholder Placeholder text for the variant title while loading.
 * @returns {React.ReactNode} Variant settings panel.
 */
const VariantPanel = ( { index, blockId, postId, title, variant, variants, onMouseDown } ) => {
	const { updateBlockAttributes } = useDispatch( 'core/block-editor' );

	const defaultPercentage = 100 / variants.length;
	const minPercentage = variants.length > 1 ? 0 : 100;

	// Get A/B Test Block Id
	const abPost = useSelect( select => {
		return select( 'analytics/xbs' ).getPost( blockId );
	}, [ blockId ] );

	return (
		<PanelBody title={ title } onMouseDown={ onMouseDown }>
			<TextControl
				label={ __( 'Title', 'altis-analytics' ) }
				placeholder={ title }
				value={ variant.attributes.title || '' }
				onChange={ newTitle => updateBlockAttributes( variant.clientId, { title: newTitle } ) }
			/>
			<GoalPicker
				goal={ variant.attributes.goal }
				onChange={ goal => updateBlockAttributes( variant.clientId, { goal } ) }
			/>
			<RangeControl
				label={ __( 'Traffic percentage', 'altis-analytics' ) }
				max={ 100 }
				min={ minPercentage }
				value={ variant.attributes.percentage || defaultPercentage }
				onChange={ percentage => {
					const percentDiff = percentage - ( variant.attributes.percentage || defaultPercentage );
					const percentDistributed = percentDiff / ( variants.length - 1 );

					updateBlockAttributes( variant.clientId, { percentage: Number( percentage ) } );

					// Modify other variants according to percentage of remaining %.
					variants.forEach( extVariant => {
						// Ignore current variant.
						if ( extVariant.clientId === variant.clientId ) {
							return;
						}

						// Get adjusted percentage.
						const adjustedPercentage = ( extVariant.attributes.percentage || defaultPercentage ) - percentDistributed;
						updateBlockAttributes( extVariant.clientId, { percentage: Number( adjustedPercentage ) } );
					} );
				} }
			/>
		</PanelBody>
	);
};

export default VariantPanel;
