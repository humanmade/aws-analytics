import React from 'react';

import {
	NUMERIC_OPERATIONS,
	STRING_OPERATIONS,
} from '../data/constants';

const SelectOperator = props => {
	const {
		fieldType = 'string',
	} = props;

	let options = STRING_OPERATIONS;

	if ( fieldType === 'number' ) {
		options = NUMERIC_OPERATIONS;
	}

	return (
		<select { ...props }>
			{ Object.entries( options ).map( ( [ value, label ] ) => (
				<option value={ value }>{ label }</option>
			) ) }
		</select>
	);
};

export default SelectOperator;
