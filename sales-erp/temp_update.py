# -*- coding: utf-8 -*-
from pathlib import Path
path = Path('app/sales-services/jobcard/page.jsx')
data = path.read_text()
marker = data.rfind('  return (')
if marker == -1:
    raise SystemExit('return block not found')
new_block = """
  return (
    <AppPageShell contentClassName=\"mx-auto w-full max-w-[1240px] px-4 py-3\">
      <div className=\"rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]\">
        <div className=\"mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between\">
          <div>
            <h1 className=\"text-[20px] font-bold text-slate-900\">Document Controller Job Cards</h1>
            <p className=\"text-[13px] text-slate-500\">Manage the queue and record every job card entry.</p>
          </div>
          <div className=\"flex items-center gap-2\">
            <button
              type=\"button\"
              onClick={() => setViewMode(JOBCARD_TAB_IDS.QUEUE)}
              className={`rounded-full border px-4 py-2 text-[12px] font-bold tracking-wide transition ${
                viewMode === JOBCARD_TAB_IDS.QUEUE
                  ? \"border-sky-500 bg-sky-50 text-sky-600\"
                  : \"border-slate-200 bg-white text-slate-500 hover:border-slate-300\"
              }`}
            >
              Jobcard Queue
            </button>
            <button
              type=\"button\"
              onClick={() => setViewMode(JOBCARD_TAB_IDS.DETAILS)}
              className={`rounded-full border px-4 py-2 text-[12px] font-bold tracking-wide transition ${
                viewMode === JOBCARD_TAB_IDS.DETAILS
                  ? \"border-emerald-500 bg-emerald-50 text-emerald-600\"
                  : \"border-slate-200 bg-white text-slate-500 hover:border-slate-300\"
              }`}
            >
              Opening Job Card
            </button>
            <button
              type=\"button\"
              onClick={() => setViewMode(JOBCARD_TAB_IDS.DETAILS)}
              className=\"rounded-full border border-slate-200 p-2 text-slate-500 hover:border-slate-300\"
              title=\"Show job card list\"
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {statusMessage ? (
          <div className=\"mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-[13px] text-slate-700\">
            {statusMessage}
          </div>
        ) : null}

        {viewMode === JOBCARD_TAB_IDS.QUEUE ? (
          <div className=\"overflow-hidden rounded-[18px] border border-slate-200 bg-white\">
            <div className=\"flex flex-col gap-3 border-b px-4 py-3 text-slate-600 sm:flex-row sm:items-center sm:justify-between\">
              <div>
                <p className=\"text-[13px] font-semibold text-slate-700\">Search purchases</p>
                <p className=\"text-[11px] text-slate-500\">Filter by PO, RFQ, attention, company or cost sheet.</p>
              </div>
              <input
                type=\"text\"
                value={queueSearch}
                onChange={(event) => setQueueSearch(event.target.value)}
                placeholder=\"Search purchase orders...\"
                className=\"w-full max-w-[260px] rounded-[10px] border border-slate-200 px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-sky-400\"
              />
            </div>
            <div className=\"overflow-x-auto\">
              {loading ? (
                <div className=\"px-4 py-12 text-center text-[13px] text-slate-500\">Loading queue...</div>
              ) : filteredQueue.length === 0 ? (
                <div className=\"px-4 py-12 text-center text-[13px] text-slate-500\">
                  {purchaseOrders.length
                    ? \"No purchase orders match the current filter.\"
                    : \"No purchase orders available.\"}
                </div>
              ) : (
                <table className=\"min-w-[1240px] w-full border-collapse text-[13px] text-slate-700\">
                  <thead className=\"bg-[#f7fafc] text-slate-600\">
                    <tr>
                      <th className=\"border-b border-slate-200 px-4 py-3 font-semibold\">SL No</th>
                      <th className=\"border-b border-slate-200 px-4 py-3 font-semibold\">P.O. No</th>
                      <th className=\"border-b border-slate-200 px-4 py-3 font-semibold\">Quotation No</th>
                      <th className=\"border-b border-slate-200 px-4 py-3 font-semibold\">Attention</th>
                      <th className=\"border-b border-slate-200 px-4 py-3 font-semibold\">Company</th>
                      <th className=\"border-b border-slate-200 px-4 py-3 font-semibold\">RFQ No</th>
                      <th className=\"border-b border-slate-200 px-4 py-3 font-semibold\">Cost Estimation</th>
                      <th className=\"border-b border-slate-200 px-4 py-3 font-semibold\">P.O. Date</th>
                      <th className=\"border-b border-slate-200 px-4 py-3 font-semibold\">P.O. Received</th>
                      <th className=\"border-b border-slate-200 px-4 py-3 font-semibold\">Expected Delivery</th>
                      <th className=\"border-b border-slate-200 px-4 py-3 font-semibold\">View</th>
                      <th className=\"border-b border-slate-200 px-4 py-3 font-semibold\">Actions</th>
                    </tr>
                  </thead>
                  <tbody className=\"bg-white\">
                    {paginatedQueue.map((row, index) => {
                      const rowIndex = (queuePage - 1) * perPage + index + 1;
                      const hasReceived = Boolean(row.po_received_date);
                      const service = salesServices.find((svc) => svc.rfq_no === row.rfq_no);
                      return (
                        <tr key={row.id} className=\"align-top\">
                          <td className=\"border-b border-slate-100 px-4 py-3\">{rowIndex}</td>
                          <td className=\"border-b border-slate-100 px-4 py-3\">{row.po_no || \"-\"}</td>
                          <td className=\"border-b border-slate-100 px-4 py-3\">{row.quotation_no || \"-\"}</td>
                          <td className=\"border-b border-slate-100 px-4 py-3\">{row.attention || \"-\"}</td>
                          <td className=\"border-b border-slate-100 px-4 py-3\">
                            {service?.company_name || row.company_address || \"-\"}
                          </td>
                          <td className=\"border-b border-slate-100 px-4 py-3\">{row.rfq_no || \"-\"}</td>
                          <td className=\"border-b border-slate-100 px-4 py-3\">{row.cost_estimation_no || \"-\"}</td>
                          <td className=\"border-b border-slate-100 px-4 py-3\">{formatDateValue(row.po_date)}</td>
                          <td className=\"border-b border-slate-100 px-4 py-3\">{formatDateValue(row.po_received_date)}</td>
                          <td className=\"border-b border-slate-100 px-4 py-3\">{formatDateValue(row.expected_delivery_date)}</td>
                          <td className=\"border-b border-slate-100 px-4 py-3\">
                            <button
                              type=\"button\"
                              onClick={() => handleJobcardClick(row)}
                              className=\"inline-flex items-center justify-center rounded-full border border-slate-200 bg-white p-2 text-slate-500 hover:border-slate-300\"
                            >
                              <Eye size={16} />
                            </button>
                          </td>
                          <td className=\"border-b border-slate-100 px-4 py-3\">
                            {hasReceived ? (
                              <button
                                type=\"button\"
                                onClick={() => handleJobcardClick(row)}
                                className=\"inline-flex items-center justify-center rounded-[12px] border border-emerald-200 bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-600\"
                              >
                                Jobcard
                              </button>
                            ) : (
                              <div className=\"flex flex-wrap gap-2\">
                                <button
                                  type=\"button\"
                                  onClick={() =>
                                    setStatusMessage(\"Edit is handled in the backend dashboard.\")
                                  }
                                  className=\"rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-1 text-[12px] font-semibold text-slate-500\"
                                >
                                  Edit
                                </button>
                                <button
                                  type=\"button\"
                                  onClick={() =>
                                    setStatusMessage(\"Delete requests are handled via the purchase module.\")
                                  }
                                  className=\"rounded-[12px] border border-rose-200 bg-rose-50 px-3 py-1 text-[12px] font-semibold text-rose-600\"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div className=\"flex items-center justify-between border-t px-4 py-3 text-[13px] text-slate-500\">
              <span>
                Showing {queueRangeStart}-{queueRangeEnd} of {filteredQueue.length}
              </span>
              <div className=\"flex gap-2\">
                <button
                  type=\"button\"
                  onClick={() => setQueuePage((prev) => Math.max(1, prev - 1))}
                  disabled={queuePage <= 1}
                  className=\"rounded-[10px] border px-3 py-1 text-[12px] font-semibold tracking-wide text-slate-500 disabled:border-slate-200 disabled:text-slate-400\"
                >
                  Prev
                </button>
                <button
                  type=\"button\"
                  onClick={() => setQueuePage((prev) => Math.min(queueTotalPages, prev + 1))}
                  disabled={queuePage >= queueTotalPages}
                  className=\"rounded-[10px] border px-3 py-1 text-[12px] font-semibold tracking-wide text-slate-500 disabled:border-slate-200 disabled:text-slate-400\"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className=\"overflow-hidden rounded-[18px] border border-slate-200 bg-white\">
            <div className=\"flex flex-col gap-3 border-b px-4 py-3 text-slate-600 sm:flex-row sm:items-center sm:justify-between\">
              <div>
                <p className=\"text-[13px] font-semibold text-slate-700\">Saved job cards</p>
                <p className=\"text-[11px] text-slate-500\">Search by jobcard number, RFQ, or company name.</p>
              </div>
              <input
                type=\"text\"
                value={openingSearch}
                onChange={(event) => setOpeningSearch(event.target.value)}
                placeholder=\"Search job cards...\"
                className=\"w-full max-w-[260px] rounded-[10px] border border-slate-200 px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-sky-400\"
              />
            </div>
            <div className=\"overflow-x-auto\">
              {jobcardLoading ? (
                <div className=\"px-4 py-12 text-center text-[13px] text-slate-500\">Loading saved job cards...</div>
              ) : filteredOpening.length === 0 ? (
                <div className=\"px-4 py-12 text-center text-[13px] text-slate-500\">
                  No jobcards yet. Save one to start tracking.
                </div>
              ) : (
                <table className=\"min-w-[900px] w-full border-collapse text-[13px] text-slate-700\">
                  <thead className=\"bg-[#f7fafc] text-slate-600\">
                    <tr>
                      <th className=\"border-b border-slate-200 px-4 py-3 font-semibold\">Jobcard No</th>
                      <th className=\"border-b border-slate-200 px-4 py-3 font-semibold\">RFQ No</th>
                      <th className=\"border-b border-slate-200 px-4 py-3 font-semibold\">Company</th>
                      <th className=\"border-b border-slate-200 px-4 py-3 font-semibold\">Job Type</th>
                      <th className=\"border-b border-slate-200 px-4 py-3 font-semibold\">Actions</th>
                    </tr>
                  </thead>
                  <tbody className=\"bg-white\">
                    {paginatedOpening.map((record) => {
                      const isWorkshop = record.job_type?.toLowerCase() === \"workshop\";
                      return (
                        <tr key={record.id} className=\"align-top\">
                          <td className=\"border-b border-slate-100 px-4 py-3 font-semibold text-slate-900\">
                            {record.jobcard_no}
                          </td>
                          <td className=\"border-b border-slate-100 px-4 py-3\">{record.rfq_no || \"-\"}</td>
                          <td className=\"border-b border-slate-100 px-4 py-3\">
                            {record.company_name || \"-\"}
                          </td>
                          <td className=\"border-b border-slate-100 px-4 py-3\">{record.job_type || \"-\"}</td>
                          <td className=\"border-b border-slate-100 px-4 py-3\">
                            <div className=\"flex flex-wrap gap-2\">
                              <button
                                type=\"button\"
                                onClick={() => handleEditJobcard(record)}
                                className=\"rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-1 text-[12px] font-semibold text-slate-500\"
                              >
                                Edit
                              </button>
                              <button
                                type=\"button\"
                                onClick={() => handleDeleteJobcard(record)}
                                className=\"rounded-[12px] border border-rose-200 bg-rose-50 px-3 py-1 text-[12px] font-semibold text-rose-600\"
                              >
                                Delete
                              </button>
                              <button
                                type=\"button\"
                                onClick={() => handleNotify(record, \"HOD\")}
                                className=\"rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-1 text-[12px] font-semibold text-slate-600\"
                              >
                                Notify to HOD
                              </button>
                              {isWorkshop ? (
                                <button
                                  type=\"button\"
                                  onClick={() => handleNotify(record, \"Site Engineer\")}
                                  className=\"rounded-[12px] border border-amber-200 bg-amber-50 px-3 py-1 text-[12px] font-semibold text-amber-600\"
                                >
                                  Notify to Site Engineer
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div className=\"flex items-center justify-between border-t px-4 py-3 text-[13px] text-slate-500\">
              <span>
                Showing {openingRangeStart}-{openingRangeEnd} of {filteredOpening.length}
              </span>
              <div className=\"flex gap-2\">
                <button
                  type=\"button\"
                  onClick={() => setOpeningPage((prev) => Math.max(1, prev - 1))}
                  disabled={openingPage <= 1}
                  className=\"rounded-[10px] border px-3 py-1 text-[12px] font-semibold tracking-wide text-slate-500 disabled:border-slate-200 disabled:text-slate-400\"
                >
                  Prev
                </button>
                <button
                  type=\"button\"
                  onClick={() => setOpeningPage((prev) => Math.min(openingTotalPages, prev + 1))}
                  disabled={openingPage >= openingTotalPages}
                  className=\"rounded-[10px] border px-3 py-1 text-[12px] font-semibold tracking-wide text-slate-500 disabled:border-slate-200 disabled:text-slate-400\"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showCreationModal && jobcardDraft ? (
        <div className=\"fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 px-4 py-8\">
          <div className=\"w-full max-w-[960px] rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.25)]\">
            <div className=\"mb-4 flex items-start justify-between gap-4\">
              <div>
                <p className=\"text-[12px] font-semibold uppercase tracking-[0.3em] text-slate-400\">Jobcard Details</p>
                <h2 className=\"text-[18px] font-bold text-slate-900\">Create Jobcard</h2>
              </div>
              <button
                type=\"button\"
                onClick={handleCloseCreationModal}
                className=\"flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600\"
              >
                <X size={18} />
              </button>
            </div>

            {jobcardMeta ? (
              <div className=\"mb-6 flex flex-col items-start gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between\">
                <div>
                  <span className=\"text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400\">Jobcard No</span>
                  <p className=\"text-lg font-bold text-slate-900\">{jobcardMeta.jobCardNo}</p>
                </div>
                <span className=\"rounded-full bg-sky-50 px-3 py-1 text-[12px] font-semibold text-sky-600\">
                  {formatDateValue(jobcardMeta.jobCardDate)}
                </span>
              </div>
            ) : null}

            <div className=\"space-y-6\">
              <div className=\"grid gap-4 sm:grid-cols-2\">
                <div>
                  <p className=\"text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-400\">RFQ Details</p>
                  <div className=\"mt-2 space-y-1 text-[13px] text-slate-700\">
                    <p>
                      RFQ No: <span className=\"font-semibold text-slate-900\">{jobcardDraft.rfq_no || \"-\"}</span>
                    </p>
                    <p>
                      RFQ Type: <span className=\"font-semibold text-slate-900\">{jobcardDraft.rfq_type || \"-\"}</span>
                    </p>
                    <p>
                      RFQ Category: <span className=\"font-semibold text-slate-900\">{jobcardDraft.rfq_category || \"-\"}</span>
                    </p>
                    <p>
                      Cost Sheet: <span className=\"font-semibold text-slate-900\">{selectedCostEstimation?.estimation_no || jobcardDraft.cost_estimation_no || \"-\"}</span>
                      {selectedCostEstimation?.grand_total ? ` · ${formatCurrency(selectedCostEstimation.grand_total)}` : \"\"}
                    </p>
                  </div>
                </div>
                <div>
                  <p className=\"text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-400\">Client Details</p>
                  <div className=\"mt-2 space-y-1 text-[13px] text-slate-700\">
                    <p>
                      Client Name: <span className=\"font-semibold text-slate-900\">{jobcardDraft.client_name || selectedService?.client_name || \"-\"}</span>
                    </p>
                    <p>
                      Attention: <span className=\"font-semibold text-slate-900\">{jobcardDraft.attention || \"-\"}</span>
                    </p>
                    <p>
                      Company: <span className=\"font-semibold text-slate-900\">{jobcardDraft.company_name || selectedService?.company_name || \"-\"}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className=\"text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-400\">Scope Details</p>
                <div className=\"mt-2 grid gap-4 sm:grid-cols-3\">
                  <div>
                    <p className=\"text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500\">Scope Type</p>
                    <input
                      value={jobcardDraft.scope_type}
                      onChange={(event) => updateDraftField(\"scope_type\", event.target.value)}
                      className=\"mt-1 w-full rounded-[10px] border border-slate-200 px-3 py-2 text-[13px] text-slate-900\"
                    />
                  </div>
                  <div>
                    <p className=\"text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500\">Scope Description</p>
                    <textarea
                      value={jobcardDraft.scope_description}
                      onChange={(event) => updateDraftField(\"scope_description\", event.target.value)}
                      className=\"mt-1 h-20 w-full rounded-[12px] border border-slate-200 px-3 py-2 text-[13px] text-slate-900\"
                    />
                  </div>
                  <div>
                    <p className=\"text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500\">Remarks</p>
                    <textarea
                      value={jobcardDraft.scope_remarks}
                      onChange={(event) => updateDraftField(\"scope_remarks\", event.target.value)}
                      className=\"mt-1 h-20 w-full rounded-[12px] border border-slate-200 px-3 py-2 text-[13px] text-slate-900\"
                    />
                  </div>
                </div>
              </div>

              <div className=\"grid gap-4 sm:grid-cols-2\">
                <div>
                  <p className=\"text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-400\">Purchase Order Details</p>
                  <div className=\"mt-2 space-y-1 text-[13px] text-slate-700\">
                    <p>
                      P.O. No: <span className=\"font-semibold text-slate-900\">{selectedPurchaseOrder?.po_no || jobcardDraft.purchase_order_id || \"-\"}</span>
                    </p>
                    <p>
                      P.O. Date: <span className=\"font-semibold text-slate-900\">{formatDateValue(selectedPurchaseOrder?.po_date) || jobcardDraft.jobcard_date}</span>
                    </p>
                  </div>
                </div>
                <div>
                  <p className=\"text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-400\">Delivery</p>
                  <div className=\"mt-2 space-y-1 text-[13px] text-slate-700\">
                    <p>
                      Planning Date: <span className=\"font-semibold text-slate-900\">{formatDateValue(jobcardDraft.planning_date)}</span>
                    </p>
                    <p>
                      Expected Delivery: <span className=\"font-semibold text-slate-900\">{formatDateValue(jobcardDraft.expected_delivery_date)}</span>
                    </p>
                    <p>
                      Job Type:
                      <select
                        value={jobcardDraft.job_type}
                        onChange={(event) => updateDraftField(\"job_type\", event.target.value)}
                        className=\"ml-2 rounded-[10px] border border-slate-200 px-2 py-1 text-[13px] text-slate-900\"
                      >
                        {JOB_TYPE_OPTIONS.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className=\"text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-400\">Remarks</p>
                <textarea
                  value={jobcardDraft.remarks}
                  onChange={(event) => updateDraftField(\"remarks\", event.target.value)}
                  className=\"mt-2 h-20 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] text-slate-700\"
                />
              </div>
            </div>

            <div className=\"mt-6 flex justify-end gap-2\">
              <button
                type=\"button\"
                onClick={handleCloseCreationModal}
                className=\"rounded-[10px] border border-slate-200 px-4 py-2 text-[13px] font-semibold text-slate-600\"
              >
                Cancel
              </button>
              <button
                type=\"button\"
                onClick={selectedJobcard ? handleUpdateJobcard : handleSaveJobcard}
                disabled={
                  !jobcardDraft ||
                  savingJobcard ||
                  !jobcardDraft.purchase_order_id ||
                  !jobcardDraft.jobcard_no
                }
                className=\"rounded-[10px] border border-emerald-200 bg-emerald-50 px-4 py-2 text-[13px] font-semibold text-emerald-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400\"
              >
                {savingJobcard ? \"Saving...\" : selectedJobcard ? \"Update Job Card\" : \"Save Job Card\"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppPageShell>
  );
}
"""
new_data = data[:marker] + new_block
path.write_text(new_data)
