import nodemailer from "nodemailer";
import prisma from "@/lib/prisma";

// ─── Transport ──────────────────────────────────────────────────────────────────

const transporter =
  process.env.SMTP_HOST && process.env.SMTP_USER
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_PORT === "465",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
    : null;

const FROM = process.env.SMTP_FROM || "Blueprint System <noreply@example.com>";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

async function sendEmail(to: string | string[], subject: string, html: string) {
  if (!transporter) {
    console.log(`[email] SMTP not configured — skipping: "${subject}" → ${to}`);
    return;
  }
  try {
    await transporter.sendMail({
      from: FROM,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      html,
    });
    console.log(`[email] Sent: "${subject}" → ${to}`);
  } catch (err) {
    console.error(`[email] Failed: "${subject}" → ${to}`, err);
  }
}

// ─── Central Dispatcher ─────────────────────────────────────────────────────────

export async function notifyBlueprintStatusChange(
  blueprintId: string,
  newStatus: string
) {
  try {
    const bp = await prisma.blueprint.findUnique({
      where: { id: blueprintId },
      include: {
        instructor: { select: { email: true, name: true } },
        course: {
          select: {
            code: true,
            name: true,
            major: {
              select: {
                name: true,
                coordinators: {
                  include: {
                    coordinator: { select: { email: true, name: true, isActive: true } },
                  },
                },
              },
            },
          },
        },
        comments: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            coordinator: { select: { name: true } },
            admin: { select: { name: true } },
          },
        },
      },
    });

    if (!bp) return;

    const instructorEmail = bp.instructor?.email;
    const instructorName = bp.instructor?.name || bp.instructorName;
    const courseName = `${bp.course.code} — ${bp.course.name}`;
    const majorName = bp.course.major.name;

    const coordinatorEmails = bp.course.major.coordinators
      .map((cm) => cm.coordinator)
      .filter((c) => c.isActive)
      .map((c) => c.email);

    if (newStatus === "SUBMITTED") {
      // E1: Notify coordinators
      if (coordinatorEmails.length > 0) {
        sendEmail(
          coordinatorEmails,
          `New Blueprint Submitted: ${bp.title}`,
          layout(`
            <h2 style="color:#1e293b;margin:0 0 16px">New Blueprint for Review</h2>
            <p><strong>${instructorName}</strong> submitted a blueprint that needs your review.</p>
            ${field("Title", bp.title)}
            ${field("Course", courseName)}
            ${field("Major", majorName)}
            ${field("Total Marks", String(bp.totalMarks))}
            ${btn(`${BASE_URL}/coordinator`, "Review Blueprints")}
          `)
        );
      }

      // E2: Confirmation to instructor
      if (instructorEmail) {
        sendEmail(
          instructorEmail,
          `Blueprint Submitted: ${bp.title}`,
          layout(`
            <h2 style="color:#1e293b;margin:0 0 16px">Blueprint Submitted</h2>
            <p>Your blueprint has been submitted for review. A coordinator will review it shortly.</p>
            ${field("Title", bp.title)}
            ${field("Course", courseName)}
            ${field("Status", "Submitted — Awaiting Review")}
            ${btn(`${BASE_URL}/blueprint/${bp.accessToken}`, "View Blueprint")}
          `)
        );
      }
    }

    if (newStatus === "APPROVED" && instructorEmail) {
      // E3: Approval notification
      sendEmail(
        instructorEmail,
        `Blueprint Approved: ${bp.title}`,
        layout(`
          <h2 style="color:#16a34a;margin:0 0 16px">Blueprint Approved ✓</h2>
          <p>Congratulations! Your blueprint has been approved.</p>
          ${field("Title", bp.title)}
          ${field("Course", courseName)}
          ${btn(`${BASE_URL}/blueprint/${bp.accessToken}`, "View Blueprint")}
        `)
      );
    }

    if (newStatus === "NEEDS_REVISION" && instructorEmail) {
      // E4: Revision request with comments
      const commentHtml = bp.comments.length > 0
        ? `
          <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin:16px 0">
            <p style="font-weight:600;color:#92400e;margin:0 0 8px">Reviewer Comments:</p>
            ${bp.comments.map((c) => `
              <div style="background:#fff;border-radius:6px;padding:10px 12px;margin-bottom:8px;border:1px solid #fde68a">
                <div style="font-size:12px;color:#78716c">${c.coordinator?.name || c.admin?.name || "Reviewer"} — ${new Date(c.createdAt).toLocaleDateString()}</div>
                <div style="color:#1e293b;margin-top:4px">${escapeHtml(c.content)}</div>
              </div>
            `).join("")}
          </div>`
        : "";

      sendEmail(
        instructorEmail,
        `Blueprint Needs Revision: ${bp.title}`,
        layout(`
          <h2 style="color:#d97706;margin:0 0 16px">Revision Requested</h2>
          <p>Your blueprint requires changes before it can be approved. Please review the comments below and resubmit.</p>
          ${field("Title", bp.title)}
          ${field("Course", courseName)}
          ${commentHtml}
          ${btn(`${BASE_URL}/instructor/edit/${bp.accessToken}`, "Edit Blueprint")}
        `)
      );
    }
  } catch (err) {
    console.error("[email] notifyBlueprintStatusChange failed:", err);
  }
}

// ─── HTML Helpers ───────────────────────────────────────────────────────────────

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(body: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden">
    <div style="background:#4f46e5;padding:20px 24px">
      <h1 style="color:#fff;font-size:18px;margin:0">Blueprint System</h1>
    </div>
    <div style="padding:24px">
      ${body}
    </div>
    <div style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;text-align:center">
      This is an automated message from the Blueprint System.
    </div>
  </div>
</body>
</html>`;
}

function field(label: string, value: string) {
  return `<p style="margin:6px 0"><span style="color:#64748b;font-size:13px">${label}:</span> <strong style="color:#1e293b">${value}</strong></p>`;
}

function btn(href: string, text: string) {
  return `<div style="margin:24px 0 8px"><a href="${href}" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">${text}</a></div>`;
}
