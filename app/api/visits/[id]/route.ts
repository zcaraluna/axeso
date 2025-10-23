import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const visit = await prisma.visit.findUnique({
      where: { id }
    })

    if (!visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
    }

    return NextResponse.json(visit)
  } catch (error) {
    console.error('Error fetching visit:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json()
    const { exitDate, exitTime, exitRegisteredBy } = body

    const visit = await prisma.visit.update({
      where: { id },
      data: {
        exitDate,
        exitTime,
        exitRegisteredBy
      }
    })

    return NextResponse.json(visit)
  } catch (error) {
    console.error('Error updating visit:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
