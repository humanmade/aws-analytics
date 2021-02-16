import React from 'react';
import GoalPicker from './goal-picker';
import VariantAnalytics from './variant-analytics';
import VariantTitle from './variant-title';

const { AudiencePicker } = Altis.Analytics.components;

const { PanelBody } = wp.components;
const { useDispatch } = wp.data;
const { __ } = wp.i18n;

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
				<VariantAnalytics variant={ variant } />
			</PanelBody>
		);
	}

	return (
		<PanelBody title={ <VariantTitle variant={ variant } placeholder={ placeholder } /> }>
			<AudiencePicker
				audience={ variant.attributes.audience }
				onSelect={ audience => updateBlockAttributes( variant.clientId, { audience } ) }
				onClearSelection={ () => updateBlockAttributes( variant.clientId, { audience: null } ) }
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
			<VariantAnalytics variant={ variant } />
		</PanelBody>
	);
};

export default VariantPanel;
