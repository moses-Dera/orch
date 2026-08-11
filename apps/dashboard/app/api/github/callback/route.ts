import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const installationId = searchParams.get('installation_id');
  
  if (installationId) {
    return NextResponse.redirect(new URL(`/github?installation_id=${installationId}`, request.url));
  }
  
  return NextResponse.redirect(new URL(`/github`, request.url));
}
