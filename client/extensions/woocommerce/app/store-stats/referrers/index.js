/** @format */

/**
 * External dependencies
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { find } from 'lodash';
import { localize } from 'i18n-calypso';
import classnames from 'classnames';

/**
 * Internal dependencies
 */
import QuerySiteStats from 'components/data/query-site-stats';
import { getSiteStatsNormalizedData } from 'state/stats/lists/selectors';
import { getSelectedSiteId, getSelectedSiteSlug } from 'state/ui/selectors';
import { getUnitPeriod } from 'woocommerce/app/store-stats/utils';
import StoreStatsPeriodNav from 'woocommerce/app/store-stats/store-stats-period-nav';
import JetpackColophon from 'components/jetpack-colophon';
import Main from 'components/main';
import Module from 'woocommerce/app/store-stats/store-stats-module';
import SearchCard from 'components/search-card';
import StoreStatsReferrerWidget from 'woocommerce/app/store-stats/store-stats-referrer-widget';

const STAT_TYPE = 'statsStoreReferrers';

class Referrers extends Component {
	static propTypes = {
		siteId: PropTypes.number,
		query: PropTypes.object.isRequired,
		data: PropTypes.array.isRequired,
		selectedDate: PropTypes.string,
		unit: PropTypes.oneOf( [ 'day', 'week', 'month', 'year' ] ),
		slug: PropTypes.string,
		limit: PropTypes.number,
	};

	state = {
		filter: '',
		searchOpen: false,
	};

	onSearch = str => {
		this.setState( {
			filter: str,
		} );
	};

	afterSelect = () => {
		this.setState( {
			filter: '',
		} );
	};

	onSearchOpen = () => {
		this.setState( {
			searchOpen: true,
		} );
	};

	onSearchBlur = () => {
		setTimeout( () => {
			this.setState( {
				searchOpen: false,
			} );
		} );
	};

	render() {
		const { siteId, query, data, selectedDate, unit, slug, translate, queryParams } = this.props;
		const { filter, searchOpen } = this.state;
		const unitSelectedDate = getUnitPeriod( selectedDate, unit );
		const selectedData = find( data, d => d.date === unitSelectedDate ) || { data: [] };
		const showSearch = selectedData.data.length > 5;
		const showWidget = searchOpen || filter || ! showSearch;
		const selectedReferrer = find(
			selectedData.data,
			d => queryParams.referrer && queryParams.referrer === d.referrer
		);
		return (
			<Main className="referrers woocommerce" wideLayout>
				{ siteId && <QuerySiteStats statType={ STAT_TYPE } siteId={ siteId } query={ query } /> }
				<StoreStatsPeriodNav
					type="referrers"
					selectedDate={ selectedDate }
					unit={ unit }
					slug={ slug }
					query={ query }
					statType={ STAT_TYPE }
					title={ `Store Referrers${ queryParams.referrer ? ' - ' + queryParams.referrer : '' }` }
				/>
				{ showSearch && (
					<SearchCard
						className={ classnames( 'referrers__search-box', { 'is-open': showWidget } ) }
						onSearch={ this.onSearch }
						placeholder="Search Referrers"
						value={ filter }
						onSearchOpen={ this.onSearchOpen }
						onBlur={ this.onSearchBlur }
					/>
				) }
				{ showWidget && (
					<Module
						className="referrers__search-dropdown"
						siteId={ siteId }
						emptyMessage={ translate( 'No data found' ) }
						query={ query }
						statType={ STAT_TYPE }
					>
						<StoreStatsReferrerWidget
							unit={ unit }
							siteId={ siteId }
							query={ query }
							statType={ STAT_TYPE }
							selectedDate={ unitSelectedDate }
							queryParams={ queryParams }
							filter={ filter }
							slug={ slug }
							afterSelect={ this.afterSelect }
							limit={ 50 }
							pageType="referrers"
						/>
					</Module>
				) }
				{ selectedReferrer && (
					<table>
						<tbody>
							<tr key={ selectedReferrer.referrer }>
								<td>{ selectedReferrer.date }</td>
								<td>{ selectedReferrer.referrer }</td>
								<td>{ selectedReferrer.product_views }</td>
								<td>{ selectedReferrer.add_to_carts }</td>
								<td>{ selectedReferrer.product_purchases }</td>
								<td>${ selectedReferrer.sales }</td>
							</tr>
						</tbody>
					</table>
				) }
				<JetpackColophon />
			</Main>
		);
	}
}

export default connect( ( state, { query } ) => {
	const siteId = getSelectedSiteId( state );
	return {
		slug: getSelectedSiteSlug( state ),
		siteId,
		data: getSiteStatsNormalizedData( state, siteId, STAT_TYPE, query ),
	};
} )( localize( Referrers ) );
