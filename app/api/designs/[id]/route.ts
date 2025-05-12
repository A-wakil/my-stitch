import { supabase } from '../../../lib/supabaseClient'
import { NextRequest, NextResponse } from "next/server"
import { processFabricsWithImages } from '../route'

// Updated type definition to match Next.js 15 requirements
type Params = { id: string }

async function getParamsId(params: Params) {
  return params.id;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const id = params.id;
    
    const { data: design, error } = await supabase
      .from('designs')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !design) {
      return NextResponse.json({ message: "Design not found" }, { status: 404 })
    }

    return NextResponse.json(design)
  } catch (error) {
    console.error('Error fetching design:', error)
    return NextResponse.json({ message: "Error fetching design" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const id = params.id;
    const formData = await request.formData()
    const fabricsData = JSON.parse(formData.get("fabrics") as string)
    const created_by = formData.get("created_by") as string
    const availableStyles = formData.get("available_styles") 
      ? JSON.parse(formData.get("available_styles") as string) 
      : []

    // Process fabrics and their images
    const processedFabrics = await processFabricsWithImages(fabricsData, formData)

    const { data, error } = await supabase
      .from('designs')
      .update({
        title: formData.get("title"),
        description: formData.get("description"),
        fabrics: processedFabrics,
        created_by: created_by,
        completion_time: parseInt(formData.get("completion_time") as string),
        available_styles: availableStyles
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating design:', error)
      return NextResponse.json({ message: "Design not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Design updated successfully", design: data })
  } catch (error) {
    console.error('Error updating design:', error)
    return NextResponse.json({ message: "Error updating design" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const id = params.id;
    
    const { error } = await supabase
      .from('designs')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting design:', error)
      return NextResponse.json({ message: "Design not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Design deleted successfully" })
  } catch (error) {
    console.error('Error deleting design:', error)
    return NextResponse.json({ message: "Error deleting design" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const id = params.id;
    const requestBody = await request.json();
    
    // Update only the fields provided in the request
    const { data, error } = await supabase
      .from('designs')
      .update(requestBody)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating design:', error);
      return NextResponse.json({ message: "Design not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      message: requestBody.is_deleted ? "Design soft-deleted successfully" : "Design updated successfully", 
      design: data 
    });
  } catch (error) {
    console.error('Error in PATCH design:', error);
    return NextResponse.json({ message: "Error updating design" }, { status: 500 });
  }
}

