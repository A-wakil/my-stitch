import { supabase } from '../../lib/supabaseClient'
import { NextResponse } from 'next/server'


export async function GET(request: Request) {
  try {
    // Get query parameters
    const url = new URL(request.url)
    const createdBy = url.searchParams.get('created_by')
    const gender = url.searchParams.get('gender')
    
    // Start building the query
    let query = supabase
      .from('designs')
      .select('*')
      .eq('is_deleted', false)
    
    // Add filters if parameters are provided
    if (createdBy) {
      query = query.eq('created_by', createdBy)
    }
    
    if (gender) {
      query = query.eq('gender', gender)
    }

    if (!createdBy) {
      query = query.or('approval_status.eq.approved,approval_status.is.null')
    }
    
    // Execute the query with ordering
    const { data: designs, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(designs)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function processImages(formData: FormData, bucket: string) {
  const images = formData.getAll("images") as File[]
  const imageUrls: string[] = JSON.parse(formData.get("existingImages") as string || "[]")
  
  for (const image of images) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(`${Date.now()}-${image.name}`, image)
      
      if (error) throw error
      
      const urlData = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path)
      
      imageUrls.push(urlData.data.publicUrl)
    } catch (error) {
      console.error(`${bucket} upload error:`, error)
    }
  }
  
  return imageUrls
}

export async function processVideos(formData: FormData, bucket: string) {
  const videos = formData.getAll("videos") as File[]
  const videoUrls: string[] = JSON.parse(formData.get("existingVideos") as string || "[]")
  
  for (const video of videos) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(`${Date.now()}-${video.name}`, video, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (error) throw error
      
      const urlData = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path)
      
      videoUrls.push(urlData.data.publicUrl)
    } catch (error) {
      console.error(`${bucket} video upload error:`, error)
    }
  }
  
  return videoUrls
}


export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const created_by = formData.get("created_by") as string
    const price = parseFloat(formData.get("price") as string)
    const currency_code = (formData.get("currency_code") as string) || 'USD'
    
    console.log('Processing design submission...')
    console.log('Created by:', created_by)
    
    // Process design images and videos (using same bucket but separate columns)
    const imageUrls = await processImages(formData, 'design-images')
    const videoUrls = await processVideos(formData, 'design-images') // Using design-images bucket
    
    console.log('Image URLs:', imageUrls)
    console.log('Video URLs:', videoUrls)

    const { data: tailor, error: tailorError } = await supabase
      .from('tailor_details')
      .select('is_approved')
      .eq('id', created_by)
      .maybeSingle()

    if (tailorError) {
      console.error('Error checking tailor approval:', tailorError)
      return NextResponse.json({ error: 'Failed to verify tailor approval' }, { status: 500 })
    }

    if (!tailor?.is_approved) {
      return NextResponse.json({ error: 'Tailor approval required to submit designs' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('designs')
      .insert({
        title: formData.get("title"),
        description: formData.get("description"),
        images: imageUrls, // Images in images column
        videos: videoUrls, // Videos in videos column
        price: price,
        currency_code: currency_code,
        approval_status: 'pending',
        rejection_reason: null,
        created_by: created_by,
        completion_time: parseInt(formData.get("completion_time") as string),
        gender: formData.get("gender") as string
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      throw error
    }

    return NextResponse.json(
      { message: "Design submitted successfully", design: data }, 
      { status: 201 }
    )
  } catch (error) {
    console.error('Submission error details:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal Server Error',
      details: error
    }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const formData = await request.formData()
    const designId = formData.get("id")
    const created_by = formData.get("created_by") as string
    const price = parseFloat(formData.get("price") as string)
    const currency_code = (formData.get("currency_code") as string) || 'USD'
    
    const imageUrls = await processImages(formData, 'design-images')
    const videoUrls = await processVideos(formData, 'design-images') // Using design-images bucket
    
    console.log('Update - Image URLs:', imageUrls)
    console.log('Update - Video URLs:', videoUrls)

    const { data: tailor, error: tailorError } = await supabase
      .from('tailor_details')
      .select('is_approved')
      .eq('id', created_by)
      .maybeSingle()

    if (tailorError) {
      console.error('Error checking tailor approval:', tailorError)
      return NextResponse.json({ error: 'Failed to verify tailor approval' }, { status: 500 })
    }

    if (!tailor?.is_approved) {
      return NextResponse.json({ error: 'Tailor approval required to update designs' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('designs')
      .update({
        title: formData.get("title"),
        description: formData.get("description"),
        images: imageUrls, // Images in images column
        videos: videoUrls, // Videos in videos column
        price: price,
        currency_code: currency_code,
        approval_status: 'pending',
        rejection_reason: null,
        created_by: created_by,
        completion_time: parseInt(formData.get("completion_time") as string),
        gender: formData.get("gender") as string
      })
      .eq('id', designId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(
      { message: "Design updated successfully", design: data },
      { status: 200 }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal Server Error',
      details: error
    }, { status: 500 })
  }
}

