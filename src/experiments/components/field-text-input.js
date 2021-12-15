import React from 'react';

const {
	TextareaControl,
} = wp.components;
const { __ } = wp.i18n;

/**
 * Title field component.
 *
 * @param {React.ComponentProps} props The component props.
 * @returns {React.ReactNode} Title text field component.
 */
const TextInput = props => {
	const {
		allValues,
		isEditable,
		onChange,
		onRemove,
		value,
		index,
	} = props;

	return (
		<TextareaControl
			autoFocus={ ( allValues || [] ).length - 1 === index } // autoFocus={ ( allValues || [] ).length <= 1 }
			label={ null }
			placeholder={ __( 'Enter another value here.', 'altis-analytics' ) }
			readOnly={ ! isEditable }
			rows={ 3 }
			value={ value }
			onChange={ onChange }
			onFocus={ event => {
				const length = event.target.value.length * 2;
				event.target.setSelectionRange( length, length );
			} }
			onKeyUp={ event => {
				if (
					value === '' &&
					event.target.value === '' &&
					(
						( event.key && event.key === 'Backspace' ) ||
						( event.which && event.which === 8 )
					)
				) {
					onRemove();
				}
			} }
		/>
	);
};

export default TextInput;
