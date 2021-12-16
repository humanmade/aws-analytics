import React, { Fragment } from 'react';

import { getLetter, removeElement, replaceElement } from '../../utils';
import { Info, Preview, VariantContainer, Views } from '../components';
import VariantLabel from '../components/variant-label';

const { Icon } = wp.components;
const { __ } = wp.i18n;

/**
 * Featured images field component.
 *
 * @param {React.ComponentProps} props The component props.
 * @returns {React.ReactNode} Featured images field component.
 */
const VariantField = props => {
	const {
		abTest,
		defaultValue,
		isEditable,
		onChange,
		postId,
		values,
		variants,
	} = props;

	const { component: Component } = abTest;

	// Use the current post value if we have no values yet.
	const allValues = values.length > 0 ? values : [ defaultValue ];

	return (
		<Fragment>
			{ allValues.map( ( value, index ) => {
				// Get variant data.
				const variant = ( variants && variants[ index ] ) || { size: 0 };

				return (
					<VariantContainer key={ index }>
						<VariantLabel
							isEditable={ isEditable }
							label={ `
								${ abTest.singleTitle }
								${ getLetter( index ) }
								${ index === 0 ? __( '(original)', 'altis-analytics' ) : '' }
							` }
							onRemove={ () => onChange( removeElement( allValues, index ) ) }
						/>
						<Component
							key={ index }
							allValues={ allValues }
							index={ index }
							isEditable={ isEditable }
							label={ null }
							value={ value }
							onChange={ value => onChange( replaceElement( allValues, value, index ) ) }
							onRemove={ () => onChange( removeElement( allValues, index ) ) }
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
									href={ `/?p=${ postId }&set_test=test_${ abTest.id }_${ postId }:${ index }` }
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
				<>
					<VariantLabel
						isEditable={ false }
						label={ `${ abTest.singleTitle } ${ getLetter( allValues.length ) }` }
					/>
					<Component
						isEditable
						label={ null }
						onChange={ value => onChange( replaceElement( allValues, value, allValues.length ) ) }
					/>
				</>
			) }
		</Fragment>
	);
};

export default VariantField;
