import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET: Fetch all expenses
export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching expenses:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || [], { status: 200 });
  } catch (err) {
    console.error('Unexpected error in GET /api/expenses:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Create a new expense
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Validate required fields
    if (!body.date || !body.project_id || !body.category || !body.amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert([body])
      .select()
      .single();

    if (error) {
      console.error('Error creating expense:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('Unexpected error in POST /api/expenses:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH: Update an existing expense
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> } // Next.js 15 Type Definition
) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    // Await params because they are a Promise in Next.js 15
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('expenses')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating expense:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error('Unexpected error in PATCH /api/expenses/[id]:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Remove an expense
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> } // Next.js 15 Type Definition
) {
  try {
    const supabase = await createClient();
    
    // Await params because they are a Promise in Next.js 15
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting expense:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Expense deleted successfully' }, { status: 200 });
  } catch (err) {
    console.error('Unexpected error in DELETE /api/expenses/[id]:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}