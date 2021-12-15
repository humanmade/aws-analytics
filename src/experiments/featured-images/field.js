import React, { Fragment } from 'react';

import { getLetter, replaceElement } from '../../utils';
import { Info, Preview, VariantContainer, Views } from '../components';
import ImageInput from '../components/field-image-input';

const { Icon } = wp.components;
const { __ } = wp.i18n;

/**
 * Featured images field component.
 *
 * @param {React.ComponentProps} props The component props.
 * @returns {React.ReactNode} Featured images field component.
 */
const FeaturedImageField = props => {
	const {
		defaultValue,
		isEditable,
		onChange,
		postId,
		values,
		variants,
	} = props;

	// Use the current post value if we have no values yet.
	const allValues = values.length > 0 ? values : [ defaultValue ];

	return (
		<Fragment>
			{ allValues.map( ( value, index ) => {
				// Get variant data.
				const variant = ( variants && variants[ index ] ) || { size: 0 };

				return (
					<VariantContainer key={ index }>
						<ImageInput
							key={ index }
							isDisabled={ ! isEditable }
							label={ `
								${ __( 'Featured image', 'altis-analytics' ) }
								${ getLetter( index ) }
								${ index === 0 ? __( '(original)', 'altis-analytics' ) : '' }
							` }
							value={ value }
							onChange={ value => onChange( replaceElement( allValues, value, allValues.length ) ) }
						/>
						<Info>
							{ variant.size > 0 && (
								<Views>
									<Icon icon="visibility" />
									{ variant.size }
									{ ' ' }
									<span className="screen-reader-text">{ __( 'views', 'altis-analytics' ) }</span>
								</Views>
							) }
							{ ! isEditable && (
								<Preview
									href={ `/?p=${ postId }&set_test=test_featured_images_${ postId }:${ index }` }
									target="_ab_test_preview"
								>
									{ __( 'Preview', 'altis-analytics' ) }
									<Icon icon="external" />
								</Preview>
							) }
						</Info>
					</VariantContainer>
				);
			} ) }
			{ isEditable && allValues.length < 26 && (
				<ImageInput
					label={ ` ${ __( 'Featured image', 'altis-analytics' ) } ${ getLetter( allValues.length ) }` }
					onChange={ value => onChange( replaceElement( allValues, value, allValues.length ) ) }
				/>
			) }
		</Fragment>
	);
};

export default FeaturedImageField;
