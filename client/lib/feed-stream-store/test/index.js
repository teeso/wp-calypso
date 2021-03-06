/** @format */
/**
 * External dependencies
 */
import { expect } from 'chai';
import { set } from 'lodash';
import sinon from 'sinon';

/**
 * Internal dependencies
 */
import PostListFactory from '../';
import PostListStore from '../feed-stream';
import FeedStreamCache from '../feed-stream-cache';
jest.mock( 'lib/analytics', () => ( {} ) );
jest.mock( 'lib/data-poller', () => require( './mocks/lib/data-poller' ) );
jest.mock( 'lib/post-normalizer', () => require( './mocks/lib/post-normalizer' ) );
jest.mock( 'lib/wp', () => require( './mocks/lib/wp' ) );
jest.mock( 'reader/stats', () => ( {
	recordTrack: require( 'sinon' ).spy(),
} ) );
jest.mock( 'lib/redux-bridge', () => ( {
	reduxGetState: function() {
		return {
			reader: {
				posts: {
					items: {
						[ 1 ]: { feed_ID: 1, feed_item_ID: 1 },
						[ 2 ]: { feed_ID: 1, feed_item_ID: 2 },
						[ 3 ]: { feed_ID: 1, feed_item_ID: 3, _state: 'error' },
						[ 4 ]: { feed_ID: 1, feed_item_ID: 4 },
					},
				},
			},
		};
	},
} ) );

describe( 'FeedPostList', () => {
	test( 'should require an id, a fetcher, a keyMaker', () => {
		expect( function() {
			return new PostListStore();
		} ).to.throw( Error, /supply a feed stream spec/ );

		expect( function() {
			return new PostListStore( null );
		} ).to.throw( Error, /supply a feed stream spec/ );

		expect( function() {
			return new PostListStore( false );
		} ).to.throw( Error, /supply a feed stream spec/ );

		expect( function() {
			return new PostListStore( { id: 5 } );
		} ).to.throw( Error, /missing fetcher/ );

		expect( function() {
			return new PostListStore( {
				id: 5,
				fetcher: function() {},
			} );
		} ).to.throw( Error, /keyMaker/ );

		expect( function() {
			return new PostListStore( 5, function() {} );
		} ).to.be.ok;
	} );

	describe( 'A valid instance', () => {
		let fetcherStub, store;

		beforeEach( () => {
			fetcherStub = sinon.stub();
			store = new PostListStore( {
				id: 'test',
				fetcher: fetcherStub,
				keyMaker: function( post ) {
					return post;
				},
			} );
		} );

		test( 'should receive a page', () => {
			store.receivePage( 'test', null, {
				posts: [ { feed_ID: 1, ID: 1 }, { feed_ID: 1, ID: 2 } ],
			} );

			expect( store.get() ).to.have.lengthOf( 2 );
		} );

		describe( 'updates', () => {
			beforeEach( () => {
				store.receiveUpdates( 'test', null, {
					date_range: {
						before: '1999-12-31T23:59:59',
						after: '1999-12-31T23:58:00',
					},
					posts: [ { feed_ID: 1, ID: 1 }, { feed_ID: 2, ID: 2 } ],
				} );
			} );

			test( 'should receive updates', () => {
				expect( store.getUpdateCount() ).to.equal( 2 );
			} );

			test( 'should treat each set of updates as definitive', () => {
				const secondSet = {
					date_range: {
						before: '1999-12-31T23:59:59',
						after: '1999-12-31T23:58:00',
					},
					posts: [
						{
							feed_ID: 1,
							ID: 6,
							date: '1976-09-15T00:00:06+00:00',
						},
						{
							feed_ID: 1,
							ID: 5,
							date: '1976-09-15T00:00:05+00:00',
						},
						{
							feed_ID: 1,
							ID: 4,
							date: '1976-09-15T00:00:04+00:00',
						},
						{
							feed_ID: 1,
							ID: 3,
							date: '1976-09-15T00:00:03+00:00',
						},
					],
				};

				// new updates, overlapping
				store.receiveUpdates( 'test', null, secondSet );
				expect( store.getUpdateCount() ).to.equal( 4 );
			} );
		} );
	} );

	describe( 'Selected index', () => {
		let fetcherStub, store, fakePosts;
		beforeEach( () => {
			fetcherStub = sinon.stub();
			store = new PostListStore( {
				id: 'test',
				fetcher: fetcherStub,
				keyMaker: function( post ) {
					return post;
				},
			} );
			fakePosts = [
				{ feedId: 1, postId: 1 },
				{ feedId: 1, postId: 2 },
				{ feedId: 1, postId: 3 },
				{ feedId: 1, postId: 4 },
			];
			store.receivePage( 'test', null, { posts: fakePosts } );
		} );

		test( 'should initially have nothing selected', () => {
			expect( store.getSelectedPostKey() ).to.equal( null );
		} );

		test( 'should select the next item', () => {
			store.selectItem( fakePosts[ 0 ] );
			store.selectNextItem();
			expect( store.getSelectedPostKey() ).to.eql( fakePosts[ 1 ] );
		} );

		test( 'should select the next valid post', () => {
			store.selectItem( fakePosts[ 1 ] );
			store.selectNextItem();
			expect( store.getSelectedPostKey() ).to.eql( fakePosts[ 3 ] );
		} );

		test( 'should select the prev item', () => {
			store.selectItem( fakePosts[ 1 ] );
			expect( store.getSelectedPostKey() ).to.eql( fakePosts[ 1 ] );
			store.selectPrevItem();
			expect( store.getSelectedPostKey() ).to.eql( fakePosts[ 0 ] );
		} );

		test( 'should select the prev valid post', () => {
			store.selectItem( fakePosts[ 3 ] );
			expect( store.getSelectedPostKey() ).to.eql( fakePosts[ 3 ] );
			store.selectPrevItem();
			expect( store.getSelectedPostKey() ).to.eql( fakePosts[ 1 ] );
		} );
	} );

	describe( 'Filter followed x-posts', () => {
		let fetcherStub, store, posts, filteredPosts, xPostedTo;
		beforeEach( () => {
			fetcherStub = sinon.stub();
			store = new PostListStore( {
				id: 'test',
				fetcher: fetcherStub,
				keyMaker: function( post ) {
					return post;
				},
			} );
			posts = [
				set( {}, 'meta.data.post', {
					tags: { 'p2-xpost': {} },
					metadata: {
						0: {
							key: '_xpost_original_permalink',
							value: 'https://restapiusertests.wordpress.com/2015/10/23/repeat-xposts',
						},
					},
					site_name: 'Office Today',
					site_URL: 'http://officetoday.wordpress.com',
				} ),
				set( {}, 'meta.data.post', {
					tags: { 'p2-xpost': {} },
					metadata: {
						0: {
							key: '_xpost_original_permalink',
							value: 'https://restapiusertests.wordpress.com/2015/10/23/repeat-xposts',
						},
					},
					site_name: 'WordPress.com News',
					site_URL: 'http://en.blog.wordpress.com',
				} ),
				set( {}, 'meta.data.post', {
					tags: { 'p2-xpost': {} },
					metadata: {
						0: {
							key: '_xpost_original_permalink',
							value: 'https://restapiusertests.wordpress.com/2015/10/23/repeat-xposts#comment-1234',
						},
					},
					site_name: 'Foo Bar',
					site_URL: 'http://foo.bar.com',
				} ),
				set( {}, 'meta.data.post', {
					tags: { 'p2-xpost': {} },
					metadata: {
						0: {
							key: '_xpost_original_permalink',
							value: 'https://restapiusertests.wordpress.com/2015/10/23/repeat-xposts#comment-1234',
						},
					},
					site_name: 'Developer Resources',
					site_URL: 'https://developer.wordpress.com/blog',
				} ),
				set( {}, 'meta.data.post', {
					tags: { 'p2-xpost': {} },
					metadata: {
						0: {
							key: '_xpost_original_permalink',
							value: 'https://restapiusertests.wordpress.com/2015/10/23/repeat-xposts#comment-456',
						},
					},
					site_name: 'The Daily Post',
					site_URL: 'http://dailypost.wordpress.com',
				} ),
				set( {}, 'meta.data.post', {
					tags: { 'p2-xpost': {} },
					metadata: false,
					site_name: 'Example',
					site_URL: 'http://example.wordpress.com',
				} ),
				set( {}, 'meta.data.post', {
					site_URL: 'https://restapiusertests.wordpress.com/',
				} ),
			];
		} );

		test.skip( 'rolls up x-posts and matching x-comments', function() {
			filteredPosts = store.filterFollowedXPosts( posts );
			// in other words any +mentions get rolled up from the original post
			// the two +mentions from comment https://restapiusertests.wordpress.com/2015/10/23/repeat-xposts#comment-1234
			// and finally https://restapiusertests.wordpress.com/2015/10/23/repeat-xposts#comment-456
			expect( filteredPosts.length ).to.equal( 3 );
		} );

		test.skip( 'when following origin site, filters followed x-posts, but leaves comment notices', function() {
			filteredPosts = store.filterFollowedXPosts( posts );
			expect( filteredPosts.length ).to.equal( 3 );
			expect( filteredPosts[ 0 ].meta.data.post.site_URL ).to.equal( 'http://foo.bar.com' );
			expect( filteredPosts[ 1 ].meta.data.post.site_URL ).to.equal(
				'http://dailypost.wordpress.com'
			);
		} );

		test.skip( 'updates sites x-posted to', function() {
			filteredPosts = store.filterFollowedXPosts( posts );
			xPostedTo = store.getSitesCrossPostedTo(
				'https://restapiusertests.wordpress.com/2015/10/23/repeat-xposts'
			);
			expect( xPostedTo.length ).to.equal( 5 );
			expect( xPostedTo[ 0 ].siteName ).to.equal( '+officetoday' );
			expect( xPostedTo[ 0 ].siteURL ).to.equal( 'http://officetoday.wordpress.com' );
		} );

		test.skip( 'filters xposts with no metadata', function() {
			posts = [
				set( {}, 'meta.data.post', {
					tags: { 'p2-xpost': {} },
					metadata: false,
					site_name: 'Example',
					site_URL: 'http://example.wordpress.com',
				} ),
			];
			filteredPosts = store.filterFollowedXPosts( posts );
			expect( filteredPosts.length ).to.equal( 0 );
		} );

		test.skip( 'filters xposts with missing xpost metadata', function() {
			posts = [
				set( {}, 'meta.data.post', {
					tags: { 'p2-xpost': {} },
					metadata: {
						0: {
							key: 'unrelated',
							value: 'unrelated',
						},
					},
					site_name: 'Example',
					site_URL: 'http://example.wordpress.com',
				} ),
			];
			filteredPosts = store.filterFollowedXPosts( posts );
			expect( filteredPosts.length ).to.equal( 0 );
		} );
	} );

	describe( 'conversations store', () => {
		let conversations;
		beforeEach( () => {
			FeedStreamCache.clear();
			conversations = PostListFactory( 'conversations' );
		} );

		test( 'should build an instance', () => {
			expect( conversations ).to.be.ok;
		} );

		describe( 'when holding some posts', () => {
			beforeEach( () => {
				conversations.receivePage( conversations.id, null, {
					posts: [
						{
							site_ID: 1,
							ID: 1,
							date: '2016-09-15T00:00:00Z',
							last_comment_date_gmt: '2017-01-01T00:00:00Z',
							comments: [ { ID: 1 }, { ID: 2 }, { ID: 3 } ],
						},
					],
				} );
				expect( conversations.postKeys ).to.have.lengthOf( 1 );
				expect( conversations.postKeys[ 0 ].comments ).to.eql( [ 3, 2, 1 ] );
			} );

			test( 'should filter out posts that it already has which have the same comments', () => {
				const filteredPosts = conversations.filterNewPosts( [
					{
						site_ID: 1,
						ID: 1,
						last_comment_date_gmt: '2017-01-01T00:00:00Z',
						comments: [ { ID: 1 }, { ID: 2 }, { ID: 3 } ],
					},
				] );
				expect( filteredPosts ).to.have.lengthOf( 0 );
			} );

			test( 'should retain posts that it already has with new comments', () => {
				const filteredPosts = conversations.filterNewPosts( [
					{
						site_ID: 1,
						ID: 1,
						date: '2016-09-15T00:00:00Z',
						last_comment_date_gmt: '2017-01-01T01:00:00Z',
						comments: [ { ID: 2 }, { ID: 3 }, { ID: 4 } ],
					},
				] );
				expect( filteredPosts ).to.have.lengthOf( 1 );
				expect( filteredPosts ).to.eql( [
					{
						blogId: 1,
						comments: [ 4, 3, 2 ],
						date: new Date( '2016-09-15T00:00:00Z' ),
						last_comment_date_gmt: '2017-01-01T01:00:00Z',
						postId: 1,
					},
				] );
			} );

			test( 'should retain new posts', () => {
				const filteredPosts = conversations.filterNewPosts( [
					{
						site_ID: 1,
						ID: 2,
						date: '2016-09-15T00:00:00Z',
						last_comment_date_gmt: '2017-01-01T01:00:00Z',
						comments: [ { ID: 5 } ],
					},
				] );
				expect( filteredPosts ).to.have.lengthOf( 1 );
				expect( filteredPosts ).to.eql( [
					{
						blogId: 1,
						comments: [ 5 ],
						date: new Date( '2016-09-15T00:00:00Z' ),
						last_comment_date_gmt: '2017-01-01T01:00:00Z',
						postId: 2,
					},
				] );
			} );
		} );
	} );
} );
