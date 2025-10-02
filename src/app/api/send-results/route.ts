import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, results, metrics } = await request.json();

    // Create a text version of the results
    const resultsText = `
DORA Metrics Report
==================

Email: ${email}
Generated: ${new Date().toLocaleString()}

DEPLOYMENT FREQUENCY
Current Tier: ${metrics.freqT}
Deployments/month: ${results.deploys}
Per squad/month: ${metrics.perSquad.toFixed(1)}
Per engineer/month: ${metrics.perEng.toFixed(2)}

CHANGE FAILURE RATE
Current Tier: ${metrics.cfrT}
Production errors/month: ${results.errors}
CFR: ${metrics.cfr ? Math.round(metrics.cfr * 100) + '%' : 'N/A'}

LEAD TIME FOR CHANGES
Current Tier: ${metrics.ltT}
Lead time (days): ${results.leadDays || 'N/A'}

MEAN TIME TO RESTORE (MTTR)
Current Tier: ${metrics.mttrT}
MTTR (hours): ${results.mttrHours || 'N/A'}

TEAM INFORMATION
Team size: ${results.team}
Number of squads: ${results.squads}

RECOMMENDATIONS
- Adopt smaller batch sizes and trunk-based development to safely increase deployment cadence
- Automate progressive delivery (feature flags, canary, blue-green) to reduce blast radius
- Invest in test reliability (contract tests, e2e smoke) to drive CFR down toward ≤15%
- Map your value stream to reduce lead time; enforce WIP limits; parallelize reviews
- Lower MTTR with fast rollback, runbooks, on-call drills, and automated health checks
`;

    // Create HTML version of the results
    const resultsHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>DORA Metrics Report</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .metric { background: #fff; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .metric h3 { margin: 0 0 10px 0; color: #495057; }
        .tier { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .tier-elite { background: #d4edda; color: #155724; }
        .tier-high { background: #cce7ff; color: #004085; }
        .tier-medium { background: #fff3cd; color: #856404; }
        .tier-low { background: #f8d7da; color: #721c24; }
        .recommendations { background: #e2e3e5; padding: 20px; border-radius: 8px; margin-top: 20px; }
        .recommendations h3 { margin-top: 0; }
        .recommendations ul { margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>DORA Metrics Report</h1>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    </div>

    <div class="metric">
        <h3>Deployment Frequency</h3>
        <span class="tier tier-${metrics.freqT}">${metrics.freqT.toUpperCase()}</span>
        <p>Deployments/month: <strong>${results.deploys}</strong></p>
        <p>Per squad/month: <strong>${metrics.perSquad.toFixed(1)}</strong></p>
        <p>Per engineer/month: <strong>${metrics.perEng.toFixed(2)}</strong></p>
    </div>

    <div class="metric">
        <h3>Change Failure Rate</h3>
        <span class="tier tier-${metrics.cfrT}">${metrics.cfrT.toUpperCase()}</span>
        <p>Production errors/month: <strong>${results.errors}</strong></p>
        <p>CFR: <strong>${metrics.cfr ? Math.round(metrics.cfr * 100) + '%' : 'N/A'}</strong></p>
    </div>

    <div class="metric">
        <h3>Lead Time for Changes</h3>
        <span class="tier tier-${metrics.ltT}">${metrics.ltT.toUpperCase()}</span>
        <p>Lead time (days): <strong>${results.leadDays || 'N/A'}</strong></p>
    </div>

    <div class="metric">
        <h3>Mean Time to Restore (MTTR)</h3>
        <span class="tier tier-${metrics.mttrT}">${metrics.mttrT.toUpperCase()}</span>
        <p>MTTR (hours): <strong>${results.mttrHours || 'N/A'}</strong></p>
    </div>

    <div class="metric">
        <h3>Team Information</h3>
        <p>Team size: <strong>${results.team}</strong></p>
        <p>Number of squads: <strong>${results.squads}</strong></p>
    </div>

    <div class="recommendations">
        <h3>Recommendations</h3>
        <ul>
            <li>Adopt smaller batch sizes and trunk-based development to safely increase deployment cadence</li>
            <li>Automate progressive delivery (feature flags, canary, blue-green) to reduce blast radius</li>
            <li>Invest in test reliability (contract tests, e2e smoke) to drive CFR down toward ≤15%</li>
            <li>Map your value stream to reduce lead time; enforce WIP limits; parallelize reviews</li>
            <li>Lower MTTR with fast rollback, runbooks, on-call drills, and automated health checks</li>
        </ul>
    </div>
</body>
</html>
`;

    // Send email using a simple email service (you can replace this with your preferred email service)
    const emailData = {
      to: 'swanand@superlinearinsights.com',
      cc: 'vamsi@superlinearinsights.com',
      from: 'noreply@dora-check.com',
      subject: `DORA Metrics Report - ${email}`,
      text: resultsText,
      html: resultsHtml,
    };

    // For now, we'll just log the email data (you can integrate with SendGrid, AWS SES, etc.)
    console.log('Email data to be sent:', emailData);

    // In a real implementation, you would send the email here
    // Example with SendGrid:
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send(emailData);

    return NextResponse.json({ success: true, message: 'Results captured and email queued' });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
