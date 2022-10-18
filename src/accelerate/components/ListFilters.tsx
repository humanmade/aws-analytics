import React from 'react';
import { __ } from '@wordpress/i18n';
import { __experimentalRadioGroup as RadioGroup, __experimentalRadio as Radio } from '@wordpress/components';
import { decodeEntities } from '@wordpress/html-entities';

import { Dropdown, Button, MenuGroup, MenuItem } from '@wordpress/components';

import { CustomFilters, Duration, PostType, trackEvent, PeriodObject } from '../../util';

let timer: ReturnType<typeof setTimeout> | undefined;

type Props = {
	listId: string,
	searchPlaceholder: string,
	customFilters: CustomFilters,
	periods: PeriodObject[],
	postTypes: PostType[],
	period?: Duration,
	onSetPeriod: React.Dispatch<React.SetStateAction<Duration>>,
	customFilter: string,
	onSetCustomFilter: Function,
	search: string,
	onSetSearch: React.Dispatch<React.SetStateAction<string>>,
	onAddNewItem: Function,
};

export default function ListFilters ( props: Props ) {
	const {
		listId,
		periods,
		customFilters,
		postTypes,
		searchPlaceholder,
		period,
		onSetPeriod,
		customFilter,
		onSetCustomFilter,
		search,
		onSetSearch,
		onAddNewItem,
	} = props;

	function onAddNew( type: string ) {
		trackEvent( listId, 'Add New', { type } );
		return onAddNewItem( type );
	}

	return (
		<form
			className="table-controls"
			method="POST"
			onSubmit={ e => {
				e.preventDefault();
			} }
		>
			<div className="table-filter table-filter__period radio-group">
				<RadioGroup
					label='Period'
					checked={ period }
					onChange={ ( value: Duration ) => {
						trackEvent( listId, 'Period', { type: value } );
						onSetPeriod( value );
					} }
				>
					{ periods.map( p => (
						<Radio
							checked={ p.value === period }
							key={ p.value }
							value={ p.value }
						>
							{ p.label.match( /\d+/ ) }
						</Radio>
					) ) }
				</RadioGroup>
			</div>
			<div className="table-filter table-filter__custom" >
				<RadioGroup
					label='Filter'
					checked={ customFilter }
					onChange={ ( value: string ) => {
						trackEvent( listId, 'Filter', { type: value } );
						onSetCustomFilter( value )
					} }
				>
					{ Object.entries( customFilters ).map( ( [ value, { label } ] )  => (
						<Radio
							checked={ value === customFilter }
							key={ value }
							value={ value }
						>
							{ label }
						</Radio>
					) ) }
				</RadioGroup>
			</div>
			<div className="table-search">
				<label htmlFor="accelerate-search">
					<span className="dashicons dashicons-search"></span>
					<input
						id="accelerate-search"
						type="text"
						placeholder={ searchPlaceholder }
						className="search"
						value={ search }
						onChange={ e => {
							timer && clearTimeout( timer );
							timer = setTimeout( value => {
								trackEvent( 'Content Explorer', 'Search' );
								onSetSearch( value );
							}, 500, e.target.value );
						} }
					/>
				</label>
			</div>
			<div className="table-add-new">
				<Dropdown
					className=""
					contentClassName=""
					position="bottom center"
					renderToggle={ ( { isOpen, onToggle } ) => (
						<Button
							isPrimary
							onClick={ onToggle }
							aria-expanded={ isOpen }
							className='dashicons-before dashicons-plus'
						>
							{ __( 'Add New', 'altis' ) }
						</Button>
					) }
					renderContent={ () => (
						<MenuGroup>
							{ postTypes.map( type => (
								<MenuItem onClick={ () => onAddNew( type.name ) }>
									{ decodeEntities( type.singular_label ) }
								</MenuItem>
							) ) }
						</MenuGroup>
					) }
				/>
			</div>
		</form>
	);
}
