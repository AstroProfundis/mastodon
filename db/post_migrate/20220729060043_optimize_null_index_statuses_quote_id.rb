# frozen_string_literal: true

require Rails.root.join('lib', 'mastodon', 'migration_helpers')

class OptimizeNullIndexStatusesQuoteId < ActiveRecord::Migration[6.1]
  include Mastodon::MigrationHelpers

  disable_ddl_transaction!

  def up
    update_index :statuses, 'index_statuses_on_quote_id', :quote_id, where: 'quote_id IS NOT NULL'
  end

  def down
    update_index :statuses, 'index_statuses_on_quote_id', :quote_id
  end
end
