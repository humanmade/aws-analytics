import React from 'react';

import GoalPicker from './goal-picker';
import VariantTitle from './variant-title';
import VariantValidation from './variant-validation';

const { AudiencePicker } = Altis.Analytics.components;

const { PanelBody } = wp.components;
const { useDispatch } = wp.data;
const { __ } = wp.i18n;

/**
 * Variant settings panel.
 *
 * @param {React.ComponentProps} props The component props.
 * @param {object} props.variant The variant block object.
 * @param {React.ReactNode} props.placeholder Placeholder text for the variant title while loading.
 * @returns {React.ReactNode} Variant settings panel.
 */
const VariantPanel = ( { variant, placeholder = null } ) => {
	const { updateBlockAttributes } = useDispatch( 'core/block-editor' );

	if ( variant.attributes.fallback ) {
		return (
			<PanelBody title={ __( 'Fallback', 'altis-experiments' ) }>
				<p className="description">
					{ __( 'This variant will be shown as a fallback if no audiences are matched.', 'altis-experiments' ) }
				</p>
				<GoalPicker
					goal={ variant.attributes.goal }
					onChange={ goal => updateBlockAttributes( variant.clientId, { goal } ) }
				/>
				<VariantValidation
					blocks={ variant.innerBlocks }
					clientId={ variant.clientId }
					goal={ variant.attributes.goal }
				/>
			</PanelBody>
		);
	}

	return (
		<PanelBody title={ <VariantTitle placeholder={ placeholder } variant={ variant } /> }>
			<AudiencePicker
				audience={ variant.attributes.audience }
				onClearSelection={ () => updateBlockAttributes( variant.clientId, { audience: null } ) }
				onSelect={ audience => updateBlockAttributes( variant.clientId, { audience } ) }
			/>
			{ ! variant.attributes.audience && (
				<p className="description">
					{ __( 'You must select an audience for this variant.', 'altis-experiments' ) }
				</p>
			) }
			<GoalPicker
				goal={ variant.attributes.goal }
				onChange={ goal => updateBlockAttributes( variant.clientId, { goal } ) }
			/>
			<VariantValidation
				blocks={ variant.innerBlocks }
				clientId={ variant.clientId }
				goal={ variant.attributes.goal }
			/>
		</PanelBody>
	);
};

export default VariantPanel;
