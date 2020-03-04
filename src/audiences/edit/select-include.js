import React from 'react';

const SelectInclude = ( { value, onChange, name } ) => {
	return (
		<select
			onChange={ onChange }
			value={ value }
			name={ name }
		>
			<option value="any">any</option>
			<option value="all">all</option>
			<option value="none">none</option>
		</select>
	)
}

export default SelectInclude;
