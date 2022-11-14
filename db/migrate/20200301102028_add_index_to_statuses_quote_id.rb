# frozen_string_literal: true

class AddIndexToStatusesQuoteId < ActiveRecord::Migration[5.2]
  disable_ddl_transaction!

  def change
    add_index :statuses, :quote_id, algorithm: :concurrently, where: 'quote_id IS NOT NULL'
  end
end
