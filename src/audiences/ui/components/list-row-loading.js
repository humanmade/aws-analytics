import React from 'react';
import ContentLoader from 'react-content-loader';

/**
 * Audience list loading component.
 *
 * @returns {React.ReactNode} List row loading component.
 */
const ListRowLoading = () => (
	<tr>
		<td>
			<ContentLoader height={ 8 } viewBox="0 0 16 8" width={ 16 }>
				<rect height="8" rx="3" ry="3" width="16" x="0" y="0" />
			</ContentLoader>
		</td>
		<td>
			<ContentLoader height={ 30 } viewBox="0 0 200 30" width={ 200 }>
				<rect height="12" rx="3" ry="3" width="200" x="0" y="0" />
				<rect height="8" rx="3" ry="3" width="50" x="0" y="18" />
			</ContentLoader>
		</td>
		<td>
			<ContentLoader height={ 10 } viewBox="0 0 100 10" width={ 100 }>
				<rect height="8" rx="3" ry="3" width="18" x="0" y="1" />
				<rect height="8" rx="3" ry="3" width="60" x="24" y="1" />
			</ContentLoader>
		</td>
		<td>
			<ContentLoader height={ 58 } viewBox="0 0 160 58" width={ 180 }>
				<rect height="8" rx="3" ry="3" width="112" x="68" y="4" />
				<circle cx="29" cy="29" r="29" />
			</ContentLoader>
		</td>
	</tr>
);

export default ListRowLoading;
