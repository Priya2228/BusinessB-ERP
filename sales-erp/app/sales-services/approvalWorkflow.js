const createStage = () => ({
  status: "pending",
  comment: "",
});

export const createApprovalRecord = () => ({
  sentToHead: false,
  head: createStage(),
  md: createStage(),
});

export const getApprovalRecord = (approvalWorkflow) => ({
  ...createApprovalRecord(),
  sentToHead: Boolean(approvalWorkflow?.sent_to_head),
  head: {
    status: approvalWorkflow?.head_status || "pending",
    comment: approvalWorkflow?.head_comment || "",
  },
  md: {
    status: approvalWorkflow?.md_status || "pending",
    comment: approvalWorkflow?.md_comment || "",
  },
});

export const getStageLabel = (status, waitingLabel) => {
  if (status === "approved") return "APPROVED";
  if (status === "declined") return "NOT APPROVED";
  return waitingLabel;
};

export const getStageBadgeClass = (status) => {
  if (status === "approved") return "bg-emerald-500";
  if (status === "declined") return "bg-rose-500";
  return "bg-amber-500";
};

export const getOverallStatus = (record) => {
  if (record?.md?.status === "approved") return "approved";
  return "not_approved";
};
