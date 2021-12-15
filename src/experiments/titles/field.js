import React, { Fragment } from 'react';

import { getLetter, removeElement, replaceElement } from '../../utils';
import { Info, Preview, VariantContainer, Views } from '../components';

const {
	TextareaControl,
	Icon,
} = wp.components;
const { __ } = wp.i18n;

/**
 * Title field component.
 *
 * @param {React.ComponentProps} props The component props.
 * @returns {React.ReactNode} Title text field component.
 */
const TitleTextField = props => {
	const {
		defaultValue,
		isEditable,
		onChange,
		postId,
		values,
		variants,
	} = props;

	// Use the current post title if we have no values yet.
	const allTitles = values.length > 0 ? values : [ defaultValue ];

	return (
		<Fragment>
			{ allTitles.map( ( title, index ) => {
				// Get variant data.
				const variant = ( variants && variants[ index ] ) || { size: 0 };

				return (
					<VariantContainer key={ index }>
						<TextareaControl
							key={ index }
							autoFocus={ allTitles.length - 1 === index }
							label={ `
								${ __( 'Title', 'altis-analytics' ) }
								${ getLetter( index ) }
								${ index === 0 ? __( '(original)', 'altis-analytics' ) : '' }
							` }
							placeholder={ __( 'Enter another title here.', 'altis-analytics' ) }
							readOnly={ ! isEditable }
							rows={ 3 }
							value={ title }
							onChange={ value => onChange( replaceElement( allTitles, value, index ) ) }
							onFocus={ event => {
								const length = event.target.value.length * 2;
								event.target.setSelectionRange( length, length );
							} }
							onKeyUp={ event => {
								if (
									title === '' &&
									event.target.value === '' &&
									(
										( event.key && event.key === 'Backspace' ) ||
										( event.which && event.which === 8 )
									)
								) {
									onChange( removeElement( allTitles, index ) );
								}
							} }
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
									href={ `/?p=${ postId }&set_test=test_titles_${ postId }:${ index }` }
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
			{ isEditable && allTitles.length < 26 && (
				<TextareaControl
					autoFocus={ allTitles.length <= 1 }
					label={ `${ __( 'Title', 'altis-analytics' ) } ${ getLetter( allTitles.length ) }` }
					placeholder={ __( 'Enter another title here.', 'altis-analytics' ) }
					rows={ 3 }
					value=""
					onChange={ value => onChange( replaceElement( allTitles, value, allTitles.length ) ) }
				/>
			) }
		</Fragment>
	);
};

export default TitleTextField;
